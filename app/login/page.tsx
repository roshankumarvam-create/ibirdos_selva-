'use client'
import { useState } from 'react'
import { DEMO_SESSIONS, PERMISSIONS } from '../lib/auth'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const demos = Object.values(DEMO_SESSIONS)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 700))
    const session = DEMO_SESSIONS[email]
    if (session && password === 'demo123') {
      const dest = PERMISSIONS[session.role].dashboard
      window.location.href = dest
    } else {
      setError('Invalid credentials. Use password: demo123')
    }
    setLoading(false)
  }

  const inp = { width: '100%', padding: '11px 14px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#060D1A' }}>

      {/* ── Left: Login form ── */}
      <div style={{ width: '460px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '52px 48px', flexShrink: 0 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <img src="/logo.jpeg" alt="iBirdOS" style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' }} />
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#0F172A', lineHeight: 1 }}>iBirdOS</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>Work smarter, together.</div>
          </div>
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>Sign in to your account</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '28px' }}>
          Your dashboard is based on your role. You only see your own data.
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>Work email</label>
            <input type="email" placeholder="you@restaurant.com" style={inp} value={email} onChange={e => { setEmail(e.target.value); setError('') }} required />
          </div>
          <div style={{ marginBottom: '22px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>Password</label>
            <input type="password" placeholder="••••••••" style={inp} value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#DC2626' }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? '#93C5FD' : '#2563EB', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '14px' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button type="button" style={{ width: '100%', padding: '13px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Microsoft
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' as const, fontSize: '12px', color: '#CBD5E1' }}>
          Secured by Microsoft Azure Entra ID · iBirdOS v2.0
        </div>
      </div>

      {/* ── Right: Demo accounts ── */}
      <div style={{ flex: 1, padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ maxWidth: '580px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>Demo accounts</h2>
          <p style={{ fontSize: '13px', color: '#334155', marginBottom: '20px' }}>
            Each role shows a different dashboard. Click to fill credentials — password is <code style={{ color: '#93C5FD' }}>demo123</code>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {demos.map(d => {
              const perms = PERMISSIONS[d.role]
              return (
                <button
                  key={d.email}
                  onClick={() => { setEmail(d.email); setPassword('demo123'); setError('') }}
                  style={{
                    padding: '12px 14px', borderRadius: '8px',
                    textAlign: 'left' as const, cursor: 'pointer',
                    background: email === d.email ? `${d.tier_color}15` : '#0A1628',
                    border: `1px solid ${email === d.email ? d.tier_color : '#1E2A45'}`,
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: `${d.tier_color}25`, border: `1px solid ${d.tier_color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: d.tier_color, flexShrink: 0 }}>
                      {d.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#F1F5F9' }}>{d.name}</div>
                      <div style={{ fontSize: '10px', color: '#475569' }}>{d.unit_name}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: d.tier_color, color: 'white', flexShrink: 0 }}>
                      {d.role}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#334155' }}>{d.email}</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' as const }}>
                    {perms.canViewPL       && <span style={{ fontSize: '9px', color: '#059669', background: '#052E16', padding: '1px 5px', borderRadius: '3px' }}>P&L</span>}
                    {perms.canEditSales    && <span style={{ fontSize: '9px', color: '#93C5FD', background: '#1E3A5F', padding: '1px 5px', borderRadius: '3px' }}>Sales</span>}
                    {perms.canViewRecipes  && <span style={{ fontSize: '9px', color: '#A78BFA', background: '#1E1B4B', padding: '1px 5px', borderRadius: '3px' }}>Recipes</span>}
                    {perms.canViewAllUnits && <span style={{ fontSize: '9px', color: '#FCD34D', background: '#451A03', padding: '1px 5px', borderRadius: '3px' }}>All Units</span>}
                    {!perms.canViewFinancials && <span style={{ fontSize: '9px', color: '#94A3B8', background: '#1E2A45', padding: '1px 5px', borderRadius: '3px' }}>No Finance</span>}
                  </div>
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: '20px', background: '#0A1628', borderRadius: '8px', padding: '14px 16px', border: '1px solid #1E2A45' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#93C5FD', marginBottom: '5px' }}>How the access model works</div>
            <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.7' }}>
              A Restaurant Owner at Cafe 71 sees only Cafe 71 data. A Chef sees kitchen + recipes but no P&L. A Staff member sees tasks only. No user can ever see another company's data. iBirdOS Admin is internal staff only — never a customer account.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}