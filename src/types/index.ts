export type PermitType =
  | 'NB'   // New Building
  | 'A1'   // Major Alteration
  | 'A2'   // Minor Alteration
  | 'DM'   // Demolition
  | 'ALL'

export type WatchScope = 'address' | 'neighborhood'

export interface Watch {
  id: string
  userId: string
  label: string           // e.g. "Williamsburg, Brooklyn" or "123 Wythe Ave"
  scope: WatchScope
  neighborhood?: string   // e.g. "Williamsburg"
  borough?: string        // e.g. "BROOKLYN"
  address?: string        // e.g. "123 WYTHE AVE"
  permitTypes: PermitType[]
  createdAt: string       // ISO
  active: boolean
}

export interface Permit {
  id: string              // job__ from NYC Open Data
  address: string
  borough: string
  block: string
  lot: string
  permitType: string
  permitSubtype: string
  filingDate: string      // ISO
  issuanceDate: string
  ownerName: string
  contractorName: string
  jobDescription: string
  estimatedJobCost: number
  latitude?: number
  longitude?: number
}

export interface AlertRecord {
  id: string
  userId: string
  watchId: string
  permitId: string
  permit: Permit
  sentAt: string          // ISO, set once email delivered
  seenAt?: string
}

export interface UserProfile {
  uid: string
  email: string
  displayName?: string
  plan: 'trial' | 'starter' | 'pro' | 'cancelled'
  trialEndsAt?: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  createdAt: string
}

// NYC Open Data raw permit row shape (subset of fields we use)
export interface RawPermitRow {
  job__: string
  house__: string
  street_name: string
  borough: string
  block: string
  lot: string
  job_type: string
  job_status: string
  job_description: string
  latest_action_date: string
  initial_cost: string
  owner_s_first_name: string
  owner_s_last_name: string
  owner_s_business_name: string
  filing_date: string
  issuance_date: string
  permit_type: string
  permit_subtype: string
  latitude?: string
  longitude?: string
}
