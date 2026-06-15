import type { Permit, RawPermitRow, Watch } from '@/types'

const BASE_URL = 'https://data.cityofnewyork.us/resource/ipu4-2q9a.json'
// Browser-safe env: Vite exposes VITE_* vars via import.meta.env
const APP_TOKEN = (typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_NYC_OPEN_DATA_APP_TOKEN ?? '') : '')

// NYC Open Data borough codes
export const BOROUGHS: Record<string, string> = {
  MANHATTAN: 'MANHATTAN',
  BROOKLYN: 'BROOKLYN',
  QUEENS: 'QUEENS',
  BRONX: 'BRONX',
  'STATEN ISLAND': 'STATEN ISLAND',
}

// Neighborhood → borough mapping for common NYC neighborhoods
export const NEIGHBORHOOD_BOROUGH: Record<string, string> = {
  'Williamsburg': 'BROOKLYN',
  'Bushwick': 'BROOKLYN',
  'Crown Heights': 'BROOKLYN',
  'Park Slope': 'BROOKLYN',
  'Bed-Stuy': 'BROOKLYN',
  'DUMBO': 'BROOKLYN',
  'Greenpoint': 'BROOKLYN',
  'Astoria': 'QUEENS',
  'LIC': 'QUEENS',
  'Long Island City': 'QUEENS',
  'Flushing': 'QUEENS',
  'Jackson Heights': 'QUEENS',
  'East Village': 'MANHATTAN',
  'West Village': 'MANHATTAN',
  'SoHo': 'MANHATTAN',
  'Tribeca': 'MANHATTAN',
  'Harlem': 'MANHATTAN',
  'Upper West Side': 'MANHATTAN',
  'Upper East Side': 'MANHATTAN',
  'Chelsea': 'MANHATTAN',
  'Hell\'s Kitchen': 'MANHATTAN',
  'Midtown': 'MANHATTAN',
  'Bronx': 'BRONX',
  'Mott Haven': 'BRONX',
  'St. George': 'STATEN ISLAND',
}

function rowToPermit(row: RawPermitRow): Permit {
  const ownerName = [
    row.owner_s_business_name,
    [row.owner_s_first_name, row.owner_s_last_name].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(' / ')

  return {
    id: row.job__,
    address: `${row.house__} ${row.street_name}, ${row.borough}`.trim(),
    borough: row.borough,
    block: row.block,
    lot: row.lot,
    permitType: row.permit_type,
    permitSubtype: row.permit_subtype,
    filingDate: row.filing_date,
    issuanceDate: row.issuance_date,
    ownerName: ownerName || 'N/A',
    contractorName: 'N/A', // fetched separately if needed
    jobDescription: row.job_description ?? '',
    estimatedJobCost: parseFloat(row.initial_cost ?? '0'),
    latitude: row.latitude ? parseFloat(row.latitude) : undefined,
    longitude: row.longitude ? parseFloat(row.longitude) : undefined,
  }
}

function buildSoqlQuery(watch: Watch, since: Date): string {
  const sinceStr = since.toISOString().split('T')[0] // YYYY-MM-DD
  const conditions: string[] = [`filing_date >= '${sinceStr}'`]

  if (watch.scope === 'address' && watch.address) {
    // Match street name (case-insensitive via SOQL upper())
    const parts = watch.address.toUpperCase().split(' ')
    const houseNum = parts[0]
    const streetName = parts.slice(1).join(' ')
    conditions.push(`upper(street_name) = '${streetName}'`)
    if (houseNum) conditions.push(`house__ = '${houseNum}'`)
    if (watch.borough) conditions.push(`upper(borough) = '${watch.borough.toUpperCase()}'`)
  } else if (watch.scope === 'neighborhood' && watch.borough) {
    conditions.push(`upper(borough) = '${watch.borough.toUpperCase()}'`)
    // Neighborhood is approximated by borough for now; future: use BIN/block ranges
  }

  if (watch.permitTypes.length && !watch.permitTypes.includes('ALL')) {
    const types = watch.permitTypes.map(t => `'${t}'`).join(',')
    conditions.push(`permit_type in(${types})`)
  }

  return conditions.join(' AND ')
}

export async function fetchPermitsForWatch(
  watch: Watch,
  since: Date
): Promise<Permit[]> {
  const where = buildSoqlQuery(watch, since)
  const params = new URLSearchParams({
    $where: where,
    $limit: '200',
    $order: 'filing_date DESC',
  })
  if (APP_TOKEN) params.set('$$app_token', APP_TOKEN)

  const url = `${BASE_URL}?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`NYC Open Data error: ${res.status}`)

  const rows: RawPermitRow[] = await res.json()
  return rows.map(rowToPermit)
}

export async function fetchPermitsByAddress(address: string): Promise<Permit[]> {
  const parts = address.trim().toUpperCase().split(' ')
  const houseNum = parts[0]
  const streetName = parts.slice(1).join(' ')

  const params = new URLSearchParams({
    $where: `house__ = '${houseNum}' AND upper(street_name) = '${streetName}'`,
    $limit: '50',
    $order: 'filing_date DESC',
  })
  if (APP_TOKEN) params.set('$$app_token', APP_TOKEN)

  const res = await fetch(`${BASE_URL}?${params.toString()}`)
  if (!res.ok) throw new Error(`NYC Open Data error: ${res.status}`)
  const rows: RawPermitRow[] = await res.json()
  return rows.map(rowToPermit)
}

export function permitTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    NB: 'New building',
    A1: 'Major alteration',
    A2: 'Minor alteration',
    A3: 'Alteration',
    DM: 'Demolition',
    SG: 'Sign',
    EW: 'Equipment work',
    FP: 'Fire protection',
    MH: 'Mechanical',
    PL: 'Plumbing',
    BL: 'Boiler',
    EL: 'Electrical',
  }
  return labels[type] ?? type
}

export function permitTypeBadgeColor(type: string): { bg: string; color: string } {
  switch (type) {
    case 'NB': return { bg: '#E6F1FB', color: '#0C447C' }
    case 'DM': return { bg: '#FAECE7', color: '#712B13' }
    case 'A1':
    case 'A2':
    case 'A3': return { bg: '#EAF3DE', color: '#3B6D11' }
    default: return { bg: '#F1EFE8', color: '#444441' }
  }
}
