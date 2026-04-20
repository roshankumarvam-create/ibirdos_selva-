export default function RoadmapPage() {
  const emails = [
    { address: 'noreply@ibirdos.com', purpose: 'FDA alerts · System notifications · Automated emails', color: '#3B82F6', icon: '🔔' },
    { address: 'alerts@ibirdos.com', purpose: 'Price alerts · Chicken price jumps · Guardrail triggers', color: '#EF4444', icon: '🚨' },
    { address: 'billing@ibirdos.com', purpose: 'Stripe invoices · Subscription confirmations · Payment receipts', color: '#10B981', icon: '💳' },
    { address: 'support@ibirdos.com', purpose: 'Customer support tickets · Help requests', color: '#F59E0B', icon: '🎧' },
    { address: 'hello@ibirdos.com', purpose: 'Welcome emails · Staff invites · Onboarding sequences', color: '#8B5CF6', icon: '👋' },
    { address: 'partner@ibirdos.com', purpose: 'Partner communications · Integration requests', color: '#06B6D4', icon: '🤝' },
    { address: 'vendor@ibirdos.com', purpose: 'Sysco · US Foods · Vendor purchase orders', color: '#F97316', icon: '📦' },
    { address: 'CEO@prosperityaxis.com', purpose: 'Receives ALL critical alerts · Executive summary daily', color: '#EC4899', icon: '👔' },
  ]

  const phases = [
    {
      phase: 'Phase 1', title: 'Foundation', dates: 'Feb–Mar 2026',
      status: 'complete', color: '#10B981',
      items: [
        { done: true, text: 'Azure Functions live (5 endpoints)' },
        { done: true, text: 'PostgreSQL schema — 10 tables' },
        { done: true, text: 'Next.js project setup' },
        { done: true, text: 'Dashboard UI — dark corporate theme' },
        { done: true, text: 'Sysco PDF → AI extraction (GPT-4o-mini)' },
        { done: true, text: 'FDA alert system (Claude Sonnet)' },
        { done: true, text: 'Voice ordering (26 languages)' },
        { done: true, text: 'P&L analyzer (Claude Sonnet)' },
      ]
    },
    {
      phase: 'Phase 2', title: 'Core Pages',  dates: 'Apr 2026',
      status: 'active', color: '#3B82F6',
      items: [
        { done: true, text: 'Sales entry — breakfast/lunch/dinner + covers' },
        { done: true, text: 'Payment method breakdown (5 tender types)' },
        { done: true, text: 'FDA alerts — resolve + remove from inventory' },
        { done: true, text: 'Invoice PDF upload + AI extraction UI' },
        { done: true, text: 'Finance P&L — dark theme + week selector' },
        { done: false, text: 'Connect real PostgreSQL data (no mock data)' },
        { done: false, text: 'Azure AD login page' },
        { done: false, text: 'Waste log tablet UI' },
        { done: false, text: 'Push to Azure Static Web App' },
      ]
    },
    {
      phase: 'Phase 2.1', title: 'Security + Auth', dates: 'Apr 18–25, 2026',
      status: 'active', color: '#F59E0B',
      items: [
        { done: false, text: 'Azure Entra ID login (Microsoft SSO)' },
        { done: false, text: 'Role-based access (Owner/Chef/Manager/Staff)' },
        { done: false, text: 'Multi-tenant isolation (company_id on all queries)' },
        { done: false, text: 'Rate limiting on all API routes' },
        { done: false, text: 'noreply@ibirdos.com SendGrid integration' },
        { done: false, text: 'alerts@ibirdos.com price alert emails' },
        { done: false, text: 'Trial expiry banner + billing page' },
      ]
    },
    {
      phase: 'Phase 2.2', title: 'AI Modules', dates: 'Apr 25–May 9, 2026',
      status: 'planned', color: '#8B5CF6',
      items: [
        { done: false, text: 'Marketing AI — single brand campaign generator' },
        { done: false, text: 'SEO module — Google Business + Yelp manager' },
        { done: false, text: 'Poster Designer — AI image generation' },
        { done: false, text: 'Web AI Agent — site reviewer' },
        { done: false, text: 'Voice order KOT printer integration (FOH+BOH)' },
        { done: false, text: 'Clow AI chat widget on all pages' },
      ]
    },
    {
      phase: 'Phase 3', title: 'Event P&L Engine', dates: 'May 9–23, 2026',
      status: 'planned', color: '#EC4899',
      items: [
        { done: false, text: 'Live P&L — PC vs LC (price collected vs landing cost)' },
        { done: false, text: 'EventCostLine — chef edits actual qty/price live' },
        { done: false, text: 'EventStaff — labor cost calc (hours × rate × markup)' },
        { done: false, text: 'Per-cover calculator panel' },
        { done: false, text: 'Lock button → invoice trigger' },
        { done: false, text: 'Yield log — chicken starting weight + trim + photos' },
        { done: false, text: 'Yield prediction (next Thursday AI forecast)' },
        { done: false, text: 'HACCP digital log + compliance %' },
      ]
    },
    {
      phase: 'Phase 4', title: 'Finance Integration', dates: 'May 23–Jun 13, 2026',
      status: 'planned', color: '#F97316',
      items: [
        { done: false, text: 'QuickBooks sync (GL journal auto-posting)' },
        { done: false, text: 'Wave accounting integration' },
        { done: false, text: 'eVia vendor payments (ACH/card for Sysco)' },
        { done: false, text: 'Stripe billing — 5 plan tiers' },
        { done: false, text: 'vendor@ibirdos.com → Sysco purchase orders' },
        { done: false, text: 'billing@ibirdos.com → Stripe invoice emails' },
        { done: false, text: 'Price history chart (chicken volatility)' },
        { done: false, text: 'Guardrail alerts (food cost >32% → block lock)' },
      ]
    },
    {
      phase: 'Phase 5', title: 'Enterprise Scale', dates: 'Jun–Jul 2026',
      status: 'future', color: '#64748B',
      items: [
        { done: false, text: 'Multi-location rollup dashboard' },
        { done: false, text: 'Franchise dashboard (all units comparison)' },
        { done: false, text: 'Institutional dashboard (hospital/campus/hotel)' },
        { done: false, text: 'White-label (Compass, Aramark, Sodexo)' },
        { done: false, text: 'iBirdOS Admin — all accounts + MRR tracking' },
        { done: false, text: 'Micro-Cuisine engine (50+ regional cuisines)' },
        { done: false, text: 'Oracle Micros POS integration' },
        { done: false, text: 'Enterprise recipe governance' },
      ]
    },
  ]

  const guardrails = [
    { trigger: 'Chicken price +$0.15/lb or +5%', action: 'Alert to alerts@ibirdos.com + dashboard banner', severity: 'high' },
    { trigger: 'Food cost % > 32% on any event', severity: 'medium', action: 'Flag event in red on P&L page' },
    { trigger: 'Food cost % > 36% on any event', severity: 'high', action: 'Block event lock until owner approves' },
    { trigger: 'Chicken trim waste > 12%', severity: 'medium', action: 'Flag on yield dashboard + order suggestion' },
    { trigger: 'Total waste > 2% weekly', severity: 'medium', action: 'Weekly summary → AI purchasing adjustment' },
    { trigger: 'Revenue/labor hrs < $75', severity: 'medium', action: 'Flag event → reduce temp staff suggestion' },
    { trigger: 'Trial expiring in 7 days', severity: 'info', action: 'Banner on dashboard → link to billing page' },
    { trigger: 'HACCP not completed by 10 AM', severity: 'high', action: 'Push to chef → escalate to manager +1hr' },
    { trigger: 'FDA recall matches Sysco invoice item', severity: 'high', action: 'Urgent alert to noreply@ibirdos.com + CEO' },
  ]

  const statusStyle = (s: string) => ({
    complete: { bg: 'rgba(16,185,129,0.15)', color: '#34D399', text: '✓ Complete' },
    active: { bg: 'rgba(59,130,246,0.15)', color: '#60A5FA', text: '⚡ In Progress' },
    planned: { bg: 'rgba(139,92,246,0.15)', color: '#A78BFA', text: '◎ Planned' },
    future: { bg: 'rgba(100,116,139,0.15)', color: '#94A3B8', text: '○ Future' },
  }[s] || { bg: '', color: '', text: '' })

  return (
    <div style={{ padding: '32px', background: '#060D1A', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563EB, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🐦</div>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#F1F5F9' }}>iBirdOS Master Roadmap</h1>
            <p style={{ fontSize: '13px', color: '#475569' }}>ANS Corporation · Silambarasan Selvarasu · Q2 2026 → Enterprise</p>
          </div>
        </div>

        {/* MRR targets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginTop: '20px' }}>
          {[
            { label: 'Phase 1 Live', value: '$0', sub: 'Feb 2026', color: '#10B981' },
            { label: 'Phase 2 Target', value: '$300–500', sub: 'Apr 2026 MRR', color: '#3B82F6' },
            { label: 'Phase 3 Target', value: '$5,000', sub: 'Q2 2026 MRR', color: '#8B5CF6' },
            { label: 'Phase 4 Target', value: '$15,000', sub: 'Q3 2026 MRR', color: '#EC4899' },
            { label: 'Enterprise Target', value: '$100,000+', sub: 'Q4 2026 MRR', color: '#F59E0B' },
          ].map(c => (
            <div key={c.label} style={{ background: '#0A1628', border: '1px solid #1E2A45', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '4px' }}>{c.label}</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: c.color }}>{c.value}</div>
              <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase roadmap */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#93C5FD', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📋 Build Phases
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          {phases.map((p, i) => {
            const st = statusStyle(p.status)
            const done = p.items.filter(x => x.done).length
            const total = p.items.length
            const pct = Math.round((done / total) * 100)
            return (
              <div key={i} style={{ background: '#0A1628', border: `1px solid ${p.color}30`, borderTop: `3px solid ${p.color}`, borderRadius: '10px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: p.color, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{p.phase}</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#F1F5F9', marginTop: '2px' }}>{p.title}</div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{p.dates}</div>
                  </div>
                  <span style={{ background: st.bg, color: st.color, fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap' as const }}>{st.text}</span>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', marginBottom: '4px' }}>
                    <span>{done}/{total} tasks</span>
                    <span style={{ color: p.color }}>{pct}%</span>
                  </div>
                  <div style={{ height: '4px', background: '#1E2A45', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: p.color, borderRadius: '2px', transition: 'width 0.5s' }}></div>
                  </div>
                </div>

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {p.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                      <span style={{ fontSize: '12px', color: item.done ? '#10B981' : '#334155', flexShrink: 0, marginTop: '1px' }}>{item.done ? '✓' : '○'}</span>
                      <span style={{ fontSize: '12px', color: item.done ? '#64748B' : '#94A3B8', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Email directory */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#93C5FD', marginBottom: '16px' }}>
          📧 Email System Directory — iBirdOS Microsoft 365
        </h2>
        <div style={{ background: '#0A1628', border: '1px solid #1E2A45', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#060D1A' }}>
                {['Email Address', 'Purpose', 'Trigger'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' as const, textAlign: 'left', borderBottom: '1px solid #1E2A45', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emails.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #0F1C2E' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>{e.icon}</span>
                      <code style={{ fontSize: '13px', fontWeight: '600', color: e.color, background: `${e.color}15`, padding: '2px 8px', borderRadius: '4px' }}>{e.address}</code>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#94A3B8' }}>{e.purpose}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: '#1E2A45', color: '#64748B', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Automated</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guardrails */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#93C5FD', marginBottom: '16px' }}>
          🛡️ AI Guardrails + Auto-Alert System
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {guardrails.map((g, i) => (
            <div key={i} style={{
              background: '#0A1628',
              border: `1px solid ${g.severity === 'high' ? '#EF444430' : g.severity === 'medium' ? '#F59E0B30' : '#3B82F630'}`,
              borderLeft: `3px solid ${g.severity === 'high' ? '#EF4444' : g.severity === 'medium' ? '#F59E0B' : '#3B82F6'}`,
              borderRadius: '8px', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: '16px'
            }}>
              <span style={{
                background: g.severity === 'high' ? 'rgba(239,68,68,0.15)' : g.severity === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                color: g.severity === 'high' ? '#FCA5A5' : g.severity === 'medium' ? '#FCD34D' : '#93C5FD',
                fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px',
                textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, flexShrink: 0
              }}>{g.severity}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#E2E8F0' }}>{g.trigger}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', textAlign: 'right' as const, maxWidth: '360px' }}>{g.action}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Data types status */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#93C5FD', marginBottom: '16px' }}>
          🗄️ Database — Critical Tables Status
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
          {[
            { name: 'companies', status: 'done', note: 'Multi-tenant base' },
            { name: 'users', status: 'done', note: 'Roles + auth' },
            { name: 'daily_sales', status: 'done', note: 'Covers + channels' },
            { name: 'invoices', status: 'done', note: 'Sysco PDF' },
            { name: 'invoice_lines', status: 'done', note: 'AI extracted items' },
            { name: 'waste_entries', status: 'done', note: 'FDA workflow' },
            { name: 'pl_snapshots', status: 'done', note: 'Weekly P&L' },
            { name: 'fda_alerts', status: 'done', note: 'Live recalls' },
            { name: 'ai_logs', status: 'done', note: 'Token tracking' },
            { name: 'integration_requests', status: 'done', note: 'Hub requests' },
            { name: 'price_history', status: 'missing', note: 'Chicken alerts' },
            { name: 'event_pnl_snapshot', status: 'missing', note: 'Live P&L' },
            { name: 'yield_logs', status: 'missing', note: 'Trim waste' },
            { name: 'haccp_logs', status: 'missing', note: 'Compliance' },
            { name: 'invites', status: 'missing', note: 'Staff onboarding' },
            { name: 'predictions', status: 'future', note: 'AI forecast' },
          ].map((t, i) => (
            <div key={i} style={{
              background: '#0A1628',
              border: `1px solid ${t.status === 'done' ? '#10B98130' : t.status === 'missing' ? '#EF444430' : '#47556930'}`,
              borderRadius: '8px', padding: '12px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <code style={{ fontSize: '12px', color: t.status === 'done' ? '#34D399' : t.status === 'missing' ? '#FCA5A5' : '#64748B' }}>{t.name}</code>
                <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>{t.note}</div>
              </div>
              <span style={{ fontSize: '14px' }}>{t.status === 'done' ? '✅' : t.status === 'missing' ? '❌' : '🔵'}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}