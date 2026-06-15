import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, getWatches, getRecentAlerts, deleteWatch, getUserProfile } from '@/lib/firebase'
import { permitTypeLabel, permitTypeBadgeColor } from '@/lib/nyc-open-data'
import type { Watch, AlertRecord, UserProfile } from '@/types'

export default function Dashboard() {
  const navigate = useNavigate()
  const user = auth.currentUser

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [watches, setWatches] = useState<Watch[]>([])
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }

    async function load() {
      try {
        const [prof, w, a] = await Promise.all([
          getUserProfile(user!.uid),
          getWatches(user!.uid),
          getRecentAlerts(user!.uid, 20),
        ])
        setProfile(prof)
        setWatches(w)
        setAlerts(a)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [user, navigate])

  async function handleDeleteWatch(id: string) {
    setDeletingId(id)
    await deleteWatch(id)
    setWatches(prev => prev.filter(w => w.id !== id))
    setDeletingId(null)
  }

  async function handleSignOut() {
    const { logOut } = await import('@/lib/firebase')
    await logOut()
    navigate('/')
  }

  // Stats
  const thisWeek = alerts.filter(a => {
    const d = new Date(a.sentAt)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return d >= cutoff
  })

  const lastAlertDate = alerts[0]
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        -Math.round((Date.now() - new Date(alerts[0].sentAt).getTime()) / 86400000),
        'day'
      )
    : 'Never'

  // Group alerts by watchId to compute "new count" per watch
  const newByWatch = alerts.reduce<Record<string, number>>((acc, a) => {
    if (!a.seenAt) acc[a.watchId] = (acc[a.watchId] ?? 0) + 1
    return acc
  }, {})

  const initials = (user?.email ?? 'U').slice(0, 2).toUpperCase()

  if (loading) {
    return (
      <div style={{ ...pageStyle, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888', fontSize: 14 }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      {/* Nav */}
      <nav style={navStyle}>
        <div style={logoStyle}>
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="8" width="4" height="8" rx="1" fill="#185FA5" />
            <rect x="7" y="5" width="4" height="11" rx="1" fill="#185FA5" />
            <rect x="12" y="2" width="4" height="14" rx="1" fill="#185FA5" />
          </svg>
          PermitWatch NYC
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {profile && (
            <span style={{ fontSize: 12, color: '#888', background: '#f0f0f0', padding: '3px 10px', borderRadius: 20 }}>
              {profile.plan === 'trial' ? `Trial · ${daysLeft(profile.trialEndsAt)} days left` : profile.plan}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#B5D4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#0C447C' }}>
              {initials}
            </div>
            <button
              onClick={handleSignOut}
              style={{ fontSize: 13, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontFamily: 'inherit' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div style={contentStyle}>
        {/* Stats */}
        <div style={statsGrid}>
          <StatCard label="Active watches" value={String(watches.length)} />
          <StatCard label="New permits this week" value={String(thisWeek.length)} />
          <StatCard label="Last alert" value={lastAlertDate} />
        </div>

        {/* Watches */}
        <Section
          title="My watches"
          action={
            <button style={btnStyle} onClick={() => navigate('/add-watch')}>
              + Add watch
            </button>
          }
        >
          {watches.length === 0 ? (
            <EmptyState
              text="No watches yet"
              sub="Add a neighborhood or address to start receiving permit alerts."
              cta="Add your first watch"
              onCta={() => navigate('/add-watch')}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {watches.map(watch => {
                const newCount = newByWatch[watch.id] ?? 0
                return (
                  <div key={watch.id} style={watchRowStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 18, color: '#888' }}>{watch.scope === 'address' ? '📍' : '🗺️'}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#111', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{watch.label}</p>
                        <p style={{ fontSize: 12, color: '#888' }}>
                          {watch.scope === 'address' ? 'Specific address' : 'Neighborhood'} ·{' '}
                          {watch.permitTypes.includes('ALL') ? 'All types' : watch.permitTypes.join(', ')}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      {newCount > 0 ? (
                        <span style={{ background: '#E6F1FB', color: '#0C447C', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#185FA5', display: 'inline-block' }} />
                          {newCount} new
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#bbb' }}>No new</span>
                      )}
                      <button
                        onClick={() => handleDeleteWatch(watch.id)}
                        disabled={deletingId === watch.id}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, lineHeight: 1, padding: 4 }}
                        title="Remove watch"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* Recent permits */}
        <Section title="Recent permits found">
          {alerts.length === 0 ? (
            <EmptyState
              text="No permits yet"
              sub="Permits will appear here once your first daily scan runs."
            />
          ) : (
            <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
              {alerts.slice(0, 15).map((alert, i) => {
                const badge = permitTypeBadgeColor(alert.permit.permitType)
                return (
                  <div
                    key={alert.id}
                    style={{
                      padding: '12px 16px',
                      background: '#fff',
                      borderBottom: i < Math.min(alerts.length, 15) - 1 ? '1px solid #f0f0f0' : 'none',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: alert.seenAt ? '#ddd' : '#185FA5',
                        flexShrink: 0,
                        marginTop: 5,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{alert.permit.address}</p>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.color }}>
                          {permitTypeLabel(alert.permit.permitType)}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#888' }}>
                        Filed {formatDate(alert.permit.filingDate)}
                        {alert.permit.estimatedJobCost > 0 && ` · Est. $${alert.permit.estimatedJobCost.toLocaleString()}`}
                        {alert.permit.ownerName !== 'N/A' && ` · ${alert.permit.ownerName}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* Upgrade prompt for trial users */}
        {profile?.plan === 'trial' && (
          <div style={{ background: '#EAF3DE', border: '1px solid #C0DD97', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#27500A' }}>Your trial ends in {daysLeft(profile.trialEndsAt)} days</p>
              <p style={{ fontSize: 13, color: '#3B6D11' }}>Upgrade to keep receiving daily permit alerts.</p>
            </div>
            <button
              style={{ background: '#3B6D11', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
              onClick={() => navigate('/upgrade')}
            >
              Upgrade now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f7f7f7', borderRadius: 10, padding: '16px' }}>
      <p style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 500, color: '#111' }}>{value}</p>
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ text, sub, cta, onCta }: { text: string; sub: string; cta?: string; onCta?: () => void }) {
  return (
    <div style={{ border: '1px dashed #ddd', borderRadius: 10, padding: '32px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 14, fontWeight: 500, color: '#999', marginBottom: 6 }}>{text}</p>
      <p style={{ fontSize: 13, color: '#bbb', marginBottom: cta ? 16 : 0 }}>{sub}</p>
      {cta && onCta && (
        <button style={btnStyle} onClick={onCta}>{cta}</button>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysLeft(iso?: string): number {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#fafafa',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}

const navStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 24px',
  background: '#fff',
  borderBottom: '1px solid #eee',
}

const logoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontWeight: 500,
  fontSize: 15,
  color: '#111',
}

const contentStyle: React.CSSProperties = {
  maxWidth: 760,
  margin: '0 auto',
  padding: '28px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 28,
}

const statsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 12,
}

const watchRowStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: 10,
  padding: '14px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
}

const btnStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '7px 14px',
  border: '1px solid #ddd',
  borderRadius: 7,
  background: '#fff',
  cursor: 'pointer',
  color: '#333',
  fontFamily: 'inherit',
}
