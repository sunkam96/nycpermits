import { useNavigate } from 'react-router-dom'

const S = {
  page: {
    minHeight: '100vh',
    background: '#fff',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  } as React.CSSProperties,
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    borderBottom: '1px solid #eee',
  } as React.CSSProperties,
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 500,
    fontSize: 16,
    color: '#111',
    textDecoration: 'none',
  } as React.CSSProperties,
  hero: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '72px 24px 64px',
    textAlign: 'center' as const,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: 600,
    color: '#185FA5',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginBottom: 16,
  },
  h1: {
    fontSize: 40,
    fontWeight: 500,
    color: '#111',
    lineHeight: 1.15,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 17,
    color: '#555',
    lineHeight: 1.6,
    marginBottom: 36,
    maxWidth: 480,
    margin: '0 auto 36px',
  },
  ctaRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
    marginBottom: 12,
  },
  btnPrimary: {
    background: '#185FA5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
  } as React.CSSProperties,
  btnSecondary: {
    background: 'transparent',
    color: '#111',
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 15,
    cursor: 'pointer',
  } as React.CSSProperties,
  finePrint: { fontSize: 12, color: '#999', marginTop: 12 },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    borderTop: '1px solid #eee',
    borderBottom: '1px solid #eee',
  } as React.CSSProperties,
  stat: {
    padding: '28px 16px',
    textAlign: 'center' as const,
    borderRight: '1px solid #eee',
  },
  statNum: { fontSize: 26, fontWeight: 500, color: '#111', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#666' },
  howSection: {
    maxWidth: 700,
    margin: '0 auto',
    padding: '64px 24px',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 500,
    color: '#111',
    marginBottom: 40,
    textAlign: 'center' as const,
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 24,
  } as React.CSSProperties,
  stepCard: {
    background: '#fafafa',
    border: '1px solid #eee',
    borderRadius: 12,
    padding: '24px 20px',
  } as React.CSSProperties,
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#E6F1FB',
    color: '#185FA5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 12,
  } as React.CSSProperties,
  stepTitle: { fontSize: 14, fontWeight: 500, color: '#111', marginBottom: 6 },
  stepDesc: { fontSize: 13, color: '#666', lineHeight: 1.5 },
  pricingSection: {
    background: '#fafafa',
    padding: '64px 24px',
    borderTop: '1px solid #eee',
  },
  pricingInner: { maxWidth: 680, margin: '0 auto' },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 20,
    marginTop: 40,
  } as React.CSSProperties,
  planCard: {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 12,
    padding: '28px 24px',
  } as React.CSSProperties,
  planCardFeatured: {
    background: '#fff',
    border: '2px solid #185FA5',
    borderRadius: 12,
    padding: '28px 24px',
  } as React.CSSProperties,
  planBadge: {
    display: 'inline-block',
    background: '#E6F1FB',
    color: '#185FA5',
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 20,
    marginBottom: 12,
  },
  planName: { fontSize: 16, fontWeight: 500, color: '#111', marginBottom: 4 },
  planPrice: { fontSize: 30, fontWeight: 500, color: '#111', marginBottom: 4 },
  planPer: { fontSize: 13, color: '#888', marginBottom: 20 },
  planFeatures: { listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  planFeature: { fontSize: 13, color: '#555', display: 'flex', gap: 6, alignItems: 'flex-start' },
  checkmark: { color: '#185FA5', flexShrink: 0, marginTop: 1 },
  footer: {
    padding: '32px 24px',
    borderTop: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  footerLogo: { fontWeight: 500, color: '#111', fontSize: 14 },
  footerNote: { fontSize: 12, color: '#999' },
}

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={S.page}>
      {/* Nav */}
      <nav style={S.nav}>
        <div style={S.logo}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="8" width="4" height="8" rx="1" fill="#185FA5" />
            <rect x="7" y="5" width="4" height="11" rx="1" fill="#185FA5" />
            <rect x="12" y="2" width="4" height="14" rx="1" fill="#185FA5" />
          </svg>
          PermitWatch NYC
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button style={S.btnSecondary} onClick={() => navigate('/login')}>Sign in</button>
          <button style={S.btnPrimary} onClick={() => navigate('/signup')}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={S.hero}>
        <p style={S.eyebrow}>NYC Department of Buildings</p>
        <h1 style={S.h1}>Know what's being built<br />before anyone else</h1>
        <p style={S.subtitle}>
          Get daily alerts when new DOB permits are filed in the neighborhoods
          and addresses you care about. Built for contractors, investors, and curious New Yorkers.
        </p>
        <div style={S.ctaRow}>
          <button style={S.btnPrimary} onClick={() => navigate('/signup')}>
            Start free 7-day trial
          </button>
          <button style={S.btnSecondary} onClick={() => navigate('/login')}>
            Sign in
          </button>
        </div>
        <p style={S.finePrint}>No credit card required during trial</p>
      </div>

      {/* Stats strip */}
      <div style={S.statsRow}>
        <div style={S.stat}>
          <div style={S.statNum}>2,400+</div>
          <div style={S.statLabel}>Permits tracked weekly</div>
        </div>
        <div style={S.stat}>
          <div style={S.statNum}>5 boroughs</div>
          <div style={S.statLabel}>Full NYC coverage</div>
        </div>
        <div style={{ ...S.stat, borderRight: 'none' }}>
          <div style={S.statNum}>Daily</div>
          <div style={S.statLabel}>Morning digest</div>
        </div>
      </div>

      {/* How it works */}
      <div style={S.howSection}>
        <h2 style={S.sectionTitle}>How it works</h2>
        <div style={S.stepsGrid}>
          {[
            {
              n: '1',
              title: 'Set your watches',
              desc: 'Pick neighborhoods, specific addresses, or permit types — mix and match.',
            },
            {
              n: '2',
              title: 'We scan daily',
              desc: 'Every morning we pull fresh data from NYC Open Data and match it to your watches.',
            },
            {
              n: '3',
              title: 'You get a digest',
              desc: 'A clean email lands in your inbox with every new permit, the contractor, and estimated cost.',
            },
          ].map(step => (
            <div key={step.n} style={S.stepCard}>
              <div style={S.stepNum}>{step.n}</div>
              <p style={S.stepTitle}>{step.title}</p>
              <p style={S.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={S.pricingSection}>
        <div style={S.pricingInner}>
          <h2 style={{ ...S.sectionTitle, marginBottom: 8 }}>Simple pricing</h2>
          <p style={{ textAlign: 'center', color: '#666', fontSize: 14 }}>
            7-day free trial on all plans. Cancel any time.
          </p>
          <div style={S.plansGrid}>
            {/* Starter */}
            <div style={S.planCard}>
              <p style={S.planName}>Starter</p>
              <p style={S.planPrice}>$19</p>
              <p style={S.planPer}>/month</p>
              <ul style={S.planFeatures}>
                {['Up to 5 watches', 'All permit types', 'Daily email digest', 'Specific addresses or neighborhoods'].map(f => (
                  <li key={f} style={S.planFeature}>
                    <span style={S.checkmark}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                style={{ ...S.btnSecondary, width: '100%', marginTop: 24 }}
                onClick={() => navigate('/signup?plan=starter')}
              >
                Start free trial
              </button>
            </div>

            {/* Pro */}
            <div style={S.planCardFeatured}>
              <span style={S.planBadge}>Most popular</span>
              <p style={S.planName}>Pro</p>
              <p style={S.planPrice}>$49</p>
              <p style={S.planPer}>/month</p>
              <ul style={S.planFeatures}>
                {['Unlimited watches', 'All permit types', 'Daily email digest', 'Estimated job cost alerts', 'CSV export', 'Priority support'].map(f => (
                  <li key={f} style={S.planFeature}>
                    <span style={S.checkmark}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                style={{ ...S.btnPrimary, width: '100%', marginTop: 24 }}
                onClick={() => navigate('/signup?plan=pro')}
              >
                Start free trial
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={S.footer}>
        <span style={S.footerLogo}>PermitWatch NYC</span>
        <span style={S.footerNote}>Data sourced from NYC Open Data · Updated daily</span>
      </footer>
    </div>
  )
}
