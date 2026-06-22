/**
 * send-digest
 * Called by poll-permits for each user with new alerts.
 * Fetches unsent alerts from Firestore, renders the email, sends via Resend.
 */

import type { Handler, HandlerEvent } from '@netlify/functions'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { Resend } from 'resend'

function getAdminDb() {
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      })
  return getFirestore(app, 'permits')
}

function permitTypeBadgeColor(type: string): { bg: string; color: string } {
  switch (type) {
    case 'NB': return { bg: '#E6F1FB', color: '#0C447C' }
    case 'DM': return { bg: '#FAECE7', color: '#712B13' }
    case 'A1':
    case 'A2':
    case 'A3': return { bg: '#EAF3DE', color: '#3B6D11' }
    default: return { bg: '#F1EFE8', color: '#444441' }
  }
}

function permitTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    NB: 'New building', A1: 'Major alteration', A2: 'Minor alteration',
    A3: 'Alteration', DM: 'Demolition', SG: 'Sign', EW: 'Equipment work',
    FP: 'Fire protection', MH: 'Mechanical', PL: 'Plumbing', BL: 'Boiler', EL: 'Electrical',
  }
  return labels[type] ?? type
}

function formatCost(n: number): string {
  if (!n) return ''
  return `$${n.toLocaleString('en-US')}`
}

function renderEmail(params: {
  userName: string
  date: string
  alertsByWatch: Array<{ watchLabel: string; alerts: Array<{ address: string; permitType: string; estimatedJobCost: number; ownerName: string; filingDate: string }> }>
  appUrl: string
  unsubscribeUrl: string
}): string {
  const { userName, date, alertsByWatch, appUrl, unsubscribeUrl } = params

  const totalNew = alertsByWatch.reduce((s, w) => s + w.alerts.length, 0)

  const watchBlocks = alertsByWatch.map(({ watchLabel, alerts }) => {
    const permitRows = alerts.slice(0, 5).map(a => {
      const badge = permitTypeBadgeColor(a.permitType)
      const cost = formatCost(a.estimatedJobCost)
      const meta = [cost, a.ownerName !== 'N/A' ? a.ownerName : null].filter(Boolean).join(' · ')
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">
              <strong style="font-size:13px;color:#111;">${a.address}</strong>
              <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:${badge.bg};color:${badge.color};">
                ${permitTypeLabel(a.permitType)}
              </span>
            </div>
            ${meta ? `<div style="font-size:12px;color:#888;">Filed ${a.filingDate.split('T')[0]} · ${meta}</div>` : `<div style="font-size:12px;color:#888;">Filed ${a.filingDate.split('T')[0]}</div>`}
          </td>
        </tr>`
    }).join('')

    const moreCount = alerts.length > 5 ? alerts.length - 5 : 0

    return `
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:600;color:#185FA5;letter-spacing:0.06em;margin-bottom:10px;text-transform:uppercase;">
          📍 ${watchLabel} — ${alerts.length} new
        </div>
        <table style="width:100%;border-collapse:collapse;">
          ${permitRows}
        </table>
        ${moreCount > 0 ? `<div style="font-size:12px;color:#aaa;padding-top:8px;">+ ${moreCount} more · <a href="${appUrl}/dashboard" style="color:#185FA5;">View all</a></div>` : ''}
      </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Your PermitWatch digest</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#185FA5;border-radius:10px 10px 0 0;padding:20px 24px;">
      <div style="font-size:14px;font-weight:600;color:white;margin-bottom:2px;">PermitWatch NYC</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.75);">Your morning digest · ${date}</div>
    </div>

    <!-- Body -->
    <div style="background:#fff;border-radius:0 0 10px 10px;border:1px solid #eee;border-top:none;padding:24px;">
      <p style="font-size:15px;color:#333;line-height:1.5;margin:0 0 20px;">
        Good morning${userName ? ', ' + userName : ''}. <strong style="color:#111;">${totalNew} new permit${totalNew === 1 ? '' : 's'}</strong> filed overnight across your watches.
      </p>

      ${watchBlocks}

      <!-- CTA -->
      <div style="text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #eee;">
        <a href="${appUrl}/dashboard"
           style="display:inline-block;background:#185FA5;color:white;text-decoration:none;border-radius:8px;padding:11px 24px;font-size:14px;font-weight:500;">
          View all permits →
        </a>
      </div>

      <!-- Footer -->
      <div style="text-align:center;margin-top:20px;">
        <p style="font-size:11px;color:#bbb;margin:0;">
          Data from NYC Open Data · Updated daily<br/>
          <a href="${unsubscribeUrl}" style="color:#bbb;">Unsubscribe</a> ·
          <a href="${appUrl}/dashboard" style="color:#bbb;">Manage watches</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}

export const handler: Handler = async (event: HandlerEvent) => {
  // Guard: only allow calls from poll-permits (or manually for testing)
  // const secret = event.headers['x-internal-secret']
  // if (secret !== process.env.INTERNAL_SECRET) {
  //   return { statusCode: 401, body: 'Unauthorized' }
  // }

  const body = JSON.parse(event.body ?? '{}') as { userId: string }
  const { userId } = body
  console.log(`[send-digest] called for userId=${userId}`)
  if (!userId) return { statusCode: 400, body: 'Missing userId' }

  const db = getAdminDb()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.APP_URL ?? 'https://permitwatch.nyc'

  // Step 1: Load user from Firestore
  console.log(`[send-digest] loading user doc...`)
  const userDoc = await db.collection('users').doc(userId).get()
  if (!userDoc.exists) {
    console.error(`[send-digest] user ${userId} not found in Firestore`)
    return { statusCode: 404, body: 'User not found' }
  }
  const user = userDoc.data() as { email: string; displayName?: string; plan: string }
  console.log(`[send-digest] user found: ${user.email} (plan=${user.plan})`)

  // Step 2: Load alerts from last 25 hours
  const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  console.log(`[send-digest] querying alerts since ${since}`)
  const alertsSnap = await db
    .collection('alerts')
    .where('userId', '==', userId)
    .where('sentAt', '>=', since)
    .orderBy('sentAt', 'desc')
    .limit(100)
    .get()

  console.log(`[send-digest] found ${alertsSnap.size} alerts`)
  if (alertsSnap.empty) {
    console.log(`[send-digest] no alerts to send, exiting`)
    return { statusCode: 200, body: 'No new alerts' }
  }

  // Step 3: Load watch labels
  const watchesSnap = await db.collection('watches').where('userId', '==', userId).get()
  const watchLabels: Record<string, string> = {}
  watchesSnap.docs.forEach(d => { watchLabels[d.id] = (d.data() as { label: string }).label })
  console.log(`[send-digest] loaded ${watchesSnap.size} watches for label lookup`)

  // Step 4: Group alerts by watch
  const byWatch: Record<string, Array<{ address: string; permitType: string; estimatedJobCost: number; ownerName: string; filingDate: string }>> = {}
  alertsSnap.docs.forEach(d => {
    const data = d.data()
    if (!byWatch[data.watchId]) byWatch[data.watchId] = []
    byWatch[data.watchId].push(data.permit as { address: string; permitType: string; estimatedJobCost: number; ownerName: string; filingDate: string })
  })

  const alertsByWatch = Object.entries(byWatch).map(([watchId, alerts]) => ({
    watchLabel: watchLabels[watchId] ?? 'Unknown watch',
    alerts,
  }))
  console.log(`[send-digest] grouped into ${alertsByWatch.length} watches: ${alertsByWatch.map(w => `${w.watchLabel}(${w.alerts.length})`).join(', ')}`)

  // Step 5: Render and send email
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const html = renderEmail({
    userName: user.displayName ?? '',
    date,
    alertsByWatch,
    appUrl,
    unsubscribeUrl: `${appUrl}/unsubscribe?uid=${userId}`,
  })

  console.log(`[send-digest] sending email to ${user.email} via Resend (from=${process.env.RESEND_FROM_EMAIL})`)
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'digest@permitwatch.nyc',
    to: user.email,
    subject: `${alertsSnap.size} new NYC permits — ${date}`,
    html,
  })

  if (error) {
    console.error(`[send-digest] Resend error:`, JSON.stringify(error))
    return { statusCode: 500, body: JSON.stringify(error) }
  }

  console.log(`[send-digest] email sent successfully`)

  // Step 6: Mark alerts as seen
  const batch = db.batch()
  const now = new Date().toISOString()
  alertsSnap.docs.forEach(d => batch.update(d.ref, { seenAt: now }))
  await batch.commit()
  console.log(`[send-digest] marked ${alertsSnap.size} alerts as seen`)

  return { statusCode: 200, body: JSON.stringify({ ok: true, sent: alertsSnap.size }) }
}
