import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, addWatch } from '@/lib/firebase'
import { NEIGHBORHOOD_BOROUGH } from '@/lib/nyc-open-data'
import type { PermitType, WatchScope } from '@/types'

const PERMIT_OPTIONS: { value: PermitType; label: string }[] = [
  { value: 'ALL', label: 'All permit types' },
  { value: 'NB', label: 'New building' },
  { value: 'A1', label: 'Major alteration' },
  { value: 'A2', label: 'Minor alteration' },
  { value: 'DM', label: 'Demolition' },
]

const BOROUGHS = ['MANHATTAN', 'BROOKLYN', 'QUEENS', 'BRONX', 'STATEN ISLAND']

const NEIGHBORHOODS = Object.keys(NEIGHBORHOOD_BOROUGH).sort()

export default function AddWatch() {
  const navigate = useNavigate()
  const user = auth.currentUser

  const [scope, setScope] = useState<WatchScope>('neighborhood')
  const [neighborhood, setNeighborhood] = useState('')
  const [borough, setBorough] = useState('BROOKLYN')
  const [address, setAddress] = useState('')
  const [addressBorough, setAddressBorough] = useState('BROOKLYN')
  const [permitTypes, setPermitTypes] = useState<PermitType[]>(['ALL'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function togglePermitType(type: PermitType) {
    if (type === 'ALL') {
      setPermitTypes(['ALL'])
      return
    }
    setPermitTypes(prev => {
      const without = prev.filter(t => t !== 'ALL')
      if (without.includes(type)) {
        const next = without.filter(t => t !== type)
        return next.length === 0 ? ['ALL'] : next
      }
      return [...without, type]
    })
  }

  async function handleSave() {
    if (!user) return
    setError('')

    if (scope === 'neighborhood' && !neighborhood) {
      setError('Please select a neighborhood')
      return
    }
    if (scope === 'address' && !address.trim()) {
      setError('Please enter an address')
      return
    }

    setSaving(true)
    try {
      const resolvedBorough = scope === 'neighborhood'
        ? (NEIGHBORHOOD_BOROUGH[neighborhood] ?? borough)
        : addressBorough

      const label = scope === 'neighborhood'
        ? `${neighborhood}, ${toTitleCase(resolvedBorough)}`
        : `${address.trim()}, ${toTitleCase(addressBorough)}`

      await addWatch({
        userId: user.uid,
        label,
        scope,
        neighborhood: scope === 'neighborhood' ? neighborhood : undefined,
        borough: resolvedBorough,
        address: scope === 'address' ? address.trim().toUpperCase() : undefined,
        permitTypes,
        createdAt: new Date().toISOString(),
        active: true,
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save watch')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 13, marginBottom: 20, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ← Back to dashboard
        </button>

        <h1 style={{ fontSize: 20, fontWeight: 500, color: '#111', marginBottom: 6 }}>Add a watch</h1>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 28 }}>
          You'll get a daily email digest whenever new permits match your criteria.
        </p>

        {/* Scope toggle */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Watch type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['neighborhood', 'address'] as WatchScope[]).map(s => (
              <button
                key={s}
                onClick={() => setScope(s)}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: `1px solid ${scope === s ? '#185FA5' : '#ddd'}`,
                  borderRadius: 8,
                  background: scope === s ? '#E6F1FB' : '#fff',
                  color: scope === s ? '#185FA5' : '#555',
                  fontSize: 13,
                  fontWeight: scope === s ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {s === 'neighborhood' ? '🗺️ Neighborhood' : '📍 Specific address'}
              </button>
            ))}
          </div>
        </div>

        {/* Neighborhood fields */}
        {scope === 'neighborhood' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Neighborhood</label>
              <select
                value={neighborhood}
                onChange={e => setNeighborhood(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select a neighborhood…</option>
                {NEIGHBORHOODS.map(n => (
                  <option key={n} value={n}>{n} ({NEIGHBORHOOD_BOROUGH[n]})</option>
                ))}
              </select>
            </div>
            {!neighborhood && (
              <div>
                <label style={labelStyle}>Or pick a borough</label>
                <select value={borough} onChange={e => setBorough(e.target.value)} style={inputStyle}>
                  {BOROUGHS.map(b => <option key={b} value={b}>{toTitleCase(b)}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Address fields */}
        {scope === 'address' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Street address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g. 245 N 7th St"
                style={inputStyle}
              />
              <p style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Street number + street name. No borough or zip needed.</p>
            </div>
            <div>
              <label style={labelStyle}>Borough</label>
              <select value={addressBorough} onChange={e => setAddressBorough(e.target.value)} style={inputStyle}>
                {BOROUGHS.map(b => <option key={b} value={b}>{toTitleCase(b)}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Permit types */}
        <div style={{ marginBottom: 28 }}>
          <label style={labelStyle}>Permit types</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PERMIT_OPTIONS.map(opt => {
              const selected = permitTypes.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => togglePermitType(opt.value)}
                  style={{
                    padding: '7px 14px',
                    border: `1px solid ${selected ? '#185FA5' : '#ddd'}`,
                    borderRadius: 20,
                    background: selected ? '#E6F1FB' : '#fff',
                    color: selected ? '#185FA5' : '#555',
                    fontSize: 13,
                    fontWeight: selected ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <p style={{ fontSize: 13, color: '#c0392b', background: '#fdf2f2', padding: '10px 12px', borderRadius: 6, marginBottom: 16 }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            background: saving ? '#aaa' : '#185FA5',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px',
            fontSize: 15,
            fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {saving ? 'Saving…' : 'Save watch'}
        </button>
      </div>
    </div>
  )
}

function toTitleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f5f5f5',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '40px 20px',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: 12,
  padding: '32px 28px',
  width: '100%',
  maxWidth: 480,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#333',
  marginBottom: 8,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: 7,
  fontSize: 14,
  color: '#111',
  outline: 'none',
  fontFamily: 'inherit',
  background: '#fff',
}
