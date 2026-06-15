/**
 * poll-permits
 * Scheduled Netlify function — runs daily at 7am ET (12:00 UTC).
 * 1. Fetches all active watches from Firestore
 * 2. Queries NYC Open Data for permits filed in the last 24h matching each watch
 * 3. Saves new AlertRecord docs to Firestore
 * 4. Calls send-digest for each user that has new alerts
 */

import type { Handler, HandlerEvent } from '@netlify/functions'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// ─── Firebase Admin init ─────────────────────────────────────────────────────

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
  return getFirestore()
}

// ─── Types (inline to avoid path issues in functions) ────────────────────────

interface Watch {
  id: string
  userId: string
  label: string
  scope: 'address' | 'neighborhood'
  neighborhood?: string
  borough?: string
  address?: string
  permitTypes: string[]
  active: boolean
}

interface RawPermitRow {
  job__: string
  house__: string
  street_name: string
  borough: string
  block: string
  lot: string
  permit_type: string
  permit_subtype: string
  job_description?: string
  filing_date: string
  issuance_date: string
  initial_cost?: string
  owner_s_first_name?: string
  owner_s_last_name?: string
  owner_s_business_name?: string
  latitude?: string
  longitude?: string
}

// ─── NYC Open Data ───────────────────────────────────────────────────────────

const BASE_URL = 'https://data.cityofnewyork.us/resource/ipu4-2q9a.json'

async function fetchPermitsForWatch(watch: Watch, since: Date): Promise<RawPermitRow[]> {
  const sinceStr = since.toISOString().split('T')[0]
  const conditions: string[] = [`filing_date >= '${sinceStr}'`]

  if (watch.scope === 'address' && watch.address) {
    const parts = watch.address.toUpperCase().split(' ')
    const houseNum = parts[0]
    const streetName = parts.slice(1).join(' ')
    if (houseNum) conditions.push(`house__ = '${houseNum}'`)
    conditions.push(`upper(street_name) = '${streetName}'`)
    if (watch.borough) conditions.push(`upper(borough) = '${watch.borough.toUpperCase()}'`)
  } else if (watch.borough) {
    conditions.push(`upper(borough) = '${watch.borough.toUpperCase()}'`)
  }

  if (watch.permitTypes.length && !watch.permitTypes.includes('ALL')) {
    const types = watch.permitTypes.map(t => `'${t}'`).join(',')
    conditions.push(`permit_type in(${types})`)
  }

  const params = new URLSearchParams({
    $where: conditions.join(' AND '),
    $limit: '500',
    $order: 'filing_date DESC',
  })
  const appToken = process.env.NYC_OPEN_DATA_APP_TOKEN
  if (appToken) params.set('$$app_token', appToken)

  const res = await fetch(`${BASE_URL}?${params.toString()}`)
  if (!res.ok) {
    console.error(`NYC Open Data error for watch ${watch.id}: ${res.status}`)
    return []
  }
  return res.json() as Promise<RawPermitRow[]>
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export const handler: Handler = async (_event: HandlerEvent) => {
  const db = getAdminDb()
  const since = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25h window to avoid gaps

  // 1. Load all active watches
  const watchesSnap = await db
    .collection('watches')
    .where('active', '==', true)
    .get()

  const watches: Watch[] = watchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Watch))
  console.log(`Polling ${watches.length} active watches since ${since.toISOString()}`)

  // 2. Load already-seen permit IDs to avoid duplicates
  const seenPermitsSnap = await db
    .collection('alerts')
    .where('sentAt', '>=', since.toISOString())
    .get()
  const seenKeys = new Set(seenPermitsSnap.docs.map(d => {
    const data = d.data()
    return `${data.watchId}:${data.permitId}`
  }))

  // 3. Group new alerts by userId
  const alertsByUser: Record<string, Array<{ watchId: string; permit: RawPermitRow }>> = {}

  for (const watch of watches) {
    try {
      const rows = await fetchPermitsForWatch(watch, since)
      for (const row of rows) {
        const key = `${watch.id}:${row.job__}`
        if (seenKeys.has(key)) continue
        seenKeys.add(key)

        if (!alertsByUser[watch.userId]) alertsByUser[watch.userId] = []
        alertsByUser[watch.userId].push({ watchId: watch.id, permit: row })
      }
    } catch (err) {
      console.error(`Error fetching watch ${watch.id}:`, err)
    }
  }

  // 4. Write alerts to Firestore
  const batch = db.batch()
  const now = new Date().toISOString()

  for (const [userId, items] of Object.entries(alertsByUser)) {
    for (const { watchId, permit } of items) {
      const ref = db.collection('alerts').doc()
      batch.set(ref, {
        userId,
        watchId,
        permitId: permit.job__,
        permit: {
          id: permit.job__,
          address: `${permit.house__ ?? ''} ${permit.street_name}, ${permit.borough}`.trim(),
          borough: permit.borough,
          block: permit.block,
          lot: permit.lot,
          permitType: permit.permit_type,
          permitSubtype: permit.permit_subtype,
          filingDate: permit.filing_date,
          issuanceDate: permit.issuance_date,
          ownerName: [permit.owner_s_business_name, [permit.owner_s_first_name, permit.owner_s_last_name].filter(Boolean).join(' ')].filter(Boolean).join(' / ') || 'N/A',
          contractorName: 'N/A',
          jobDescription: permit.job_description ?? '',
          estimatedJobCost: parseFloat(permit.initial_cost ?? '0'),
          latitude: permit.latitude ? parseFloat(permit.latitude) : null,
          longitude: permit.longitude ? parseFloat(permit.longitude) : null,
        },
        sentAt: now,
        seenAt: null,
      })
    }
  }

  await batch.commit()
  const totalAlerts = Object.values(alertsByUser).reduce((sum, a) => sum + a.length, 0)
  console.log(`Wrote ${totalAlerts} new alert records`)

  // 5. Trigger digest emails for each affected user
  const appUrl = process.env.APP_URL ?? 'https://permitwatch.nyc'
  const digestPromises = Object.keys(alertsByUser).map(userId =>
    fetch(`${appUrl}/.netlify/functions/send-digest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_SECRET ?? '' },
      body: JSON.stringify({ userId }),
    }).catch(err => console.error(`Digest error for ${userId}:`, err))
  )
  await Promise.allSettled(digestPromises)

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, users: Object.keys(alertsByUser).length, alerts: totalAlerts }),
  }
}
