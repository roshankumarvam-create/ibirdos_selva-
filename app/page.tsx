export default function Home() {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#F8FAFC', minHeight: '100vh' }}>

      {/* HERO BANNER — food image with overlay */}
      <div style={{
        position: 'relative',
        height: '200px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0A0F1E 0%, #1E3A5F 40%, #0F2744 100%)',
      }}>
        {/* Food emoji pattern as texture */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexWrap: 'wrap',
          gap: '16px', padding: '16px',
          opacity: 0.07, fontSize: '48px',
          userSelect: 'none', overflow: 'hidden'
        }}>
          {'🍽️🥩🥗🧾💰🍳🥘🫕🍜🥙🧆🍱🥩🥗🍽️💰🧾🍳🥘🍱🥩🍽️🥗🧾🍳🥘'.split('').map((e, i) => (
            <span key={i}>{e}</span>
          ))}
        </div>

        {/* Hero content */}
        <div style={{
          position: 'relative', zIndex: 1,
          padding: '32px 32px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', animation: 'pulse 2s infinite' }}></div>
              <span style={{ fontSize: '12px', color: '#34D399', fontWeight: '600' }}>Live · April 19, 2026</span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>Good morning, Simbu 👋</h1>
            <p style={{ fontSize: '14px', color: '#93C5FD', marginTop: '6px' }}>
              Cafe 71 · Redmond, WA · Week is looking strong — revenue up 18%
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a href="/sales" style={{
              background: '#2563EB', color: 'white',
              border: 'none', borderRadius: '8px',
              padding: '10px 20px', fontSize: '14px',
              fontWeight: '600', cursor: 'pointer',
              textDecoration: 'none', display: 'inline-flex',
              alignItems: 'center', gap: '6px'
            }}>+ Add Sales Entry</a>
            <a href="/invoices" style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              color: 'white', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px', padding: '10px 20px',
              fontSize: '14px', fontWeight: '500',
              textDecoration: 'none', display: 'inline-flex',
              alignItems: 'center', gap: '6px'
            }}>Upload Invoice</a>
          </div>
        </div>

        {/* Clow AI bar inside hero */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(5,150,105,0.15)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(52,211,153,0.2)',
          padding: '10px 32px',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '14px' }}>🤖</span>
          <span style={{ fontSize: '13px', color: '#34D399', fontWeight: '500' }}>Clow AI:</span>
          <span style={{ fontSize: '13px', color: '#6EE7B7' }}>
            Diwali special drove +22% revenue this week. Re-run Tamil Nadu Feast bundle next Friday. FDA alert: Romaine recall — check Sysco INV-2891.
          </span>
        </div>
      </div>

      {/* MAIN CONTENT — clean white */}
      <div style={{ padding: '28px 32px' }}>

        {/* KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '28px'
        }}>
          {[
            { label: 'Weekly Revenue', value: '$28,400', delta: '+18%', up: true, icon: '💰', sub: 'vs last week' },
            { label: 'Food Cost %', value: '28.4%', delta: '−2.1pts', up: true, icon: '🍳', sub: 'target 30%' },
            { label: 'Waste Cost', value: '$312', delta: '+$48', up: false, icon: '♻️', sub: 'above target' },
            { label: 'Net Profit', value: '$6,820', delta: '+24%', up: true, icon: '📈', sub: '24% margin' },
          ].map(card => (
            <div key={card.label} style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                  {card.label}
                </div>
                <span style={{ fontSize: '20px' }}>{card.icon}</span>
              </div>
              <div style={{ fontSize: '30px', fontWeight: '700', color: '#0F172A', fontVariantNumeric: 'tabular-nums', marginBottom: '6px' }}>
                {card.value}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '12px', fontWeight: '600',
                  color: card.up ? '#059669' : '#DC2626',
                  background: card.up ? '#F0FDF4' : '#FEF2F2',
                  padding: '2px 8px', borderRadius: '20px'
                }}>{card.delta}</span>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>{card.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0',
          borderRadius: '12px', padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', marginBottom: '14px' }}>
            Quick Actions
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
            {[
              { label: '+ Add Sales', href: '/sales', bg: '#2563EB', color: 'white' },
              { label: '📄 Upload Invoice', href: '/invoices', bg: '#F8FAFC', color: '#374151' },
              { label: '⚠️ FDA Alerts', href: '/fda-alerts', bg: '#FEF2F2', color: '#DC2626' },
              { label: '📊 Finance P&L', href: '/finance', bg: '#F8FAFC', color: '#374151' },
              { label: '♻️ Log Waste', href: '/waste', bg: '#F8FAFC', color: '#374151' },
              { label: '📋 Roadmap', href: '/roadmap', bg: '#F8FAFC', color: '#374151' },
            ].map(action => (
              <a key={action.label} href={action.href} style={{
                background: action.bg, color: action.color,
                border: action.bg === '#F8FAFC' ? '1px solid #E2E8F0' : 'none',
                borderRadius: '8px', padding: '9px 16px',
                fontSize: '13px', fontWeight: '500',
                textDecoration: 'none', cursor: 'pointer'
              }}>{action.label}</a>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px', marginBottom: '24px' }}>

          {/* Sales table */}
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: '12px', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #F1F5F9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A' }}>Daily Sales — This Week</h3>
              <a href="/sales" style={{
                background: '#2563EB', color: 'white',
                border: 'none', borderRadius: '6px',
                padding: '7px 14px', fontSize: '13px',
                fontWeight: '500', cursor: 'pointer',
                textDecoration: 'none'
              }}>+ Add Entry</a>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Date', 'Dine-in', 'Takeout', 'Catering', 'Total', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', fontSize: '11px',
                      fontWeight: '600', color: '#94A3B8',
                      textTransform: 'uppercase' as const,
                      textAlign: 'left', borderBottom: '1px solid #E2E8F0',
                      letterSpacing: '0.05em'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { date: 'Apr 18, Fri', dine: '$2,840', take: '$1,200', cat: '$3,100', total: '$7,700' },
                  { date: 'Apr 17, Thu', dine: '$2,100', take: '$980', cat: '$1,800', total: '$5,300' },
                  { date: 'Apr 16, Wed', dine: '$1,800', take: '$760', cat: '$900', total: '$3,800' },
                  { date: 'Apr 15, Tue', dine: '$1,950', take: '$820', cat: '$1,200', total: '$4,350' },
                  { date: 'Apr 14, Mon', dine: '$1,600', take: '$700', cat: '$800', total: '$3,390' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}>
                    <td style={{ padding: '11px 16px', fontSize: '14px', fontWeight: '500', color: '#0F172A' }}>{row.date}</td>
                    <td style={{ padding: '11px 16px', fontSize: '14px', color: '#475569' }}>{row.dine}</td>
                    <td style={{ padding: '11px 16px', fontSize: '14px', color: '#475569' }}>{row.take}</td>
                    <td style={{ padding: '11px 16px', fontSize: '14px', color: '#475569' }}>{row.cat}</td>
                    <td style={{ padding: '11px 16px', fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{row.total}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{
                        background: '#F0FDF4', color: '#166534',
                        fontSize: '12px', fontWeight: '500',
                        padding: '3px 10px', borderRadius: '20px'
                      }}>Complete</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* FDA urgent */}
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderLeft: '4px solid #DC2626',
              borderRadius: '12px', padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#DC2626' }}>🚨 FDA Urgent Alert</div>
                <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' }}>ACTION REQUIRED</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', marginBottom: '4px' }}>Romaine Lettuce — E. coli Recall</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>Dole Fresh Vegetables · Lot #D-224-26 · Check Sysco INV-2891</div>
              <a href="/fda-alerts" style={{
                background: '#DC2626', color: 'white',
                borderRadius: '6px', padding: '7px 14px',
                fontSize: '12px', fontWeight: '600',
                textDecoration: 'none', display: 'inline-block'
              }}>View + Resolve →</a>
            </div>

            {/* P&L snapshot */}
            <div style={{
              background: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '12px', padding: '18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', marginBottom: '14px' }}>
                P&L Snapshot — This Week
              </div>
              {[
                { label: 'Revenue', value: '$28,400', pct: 100, color: '#3B82F6' },
                { label: 'Food Cost', value: '$8,066', pct: 28, color: '#F59E0B' },
                { label: 'Labor', value: '$7,384', pct: 26, color: '#8B5CF6' },
                { label: 'Net Profit', value: '$6,820', pct: 24, color: '#10B981' },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>{row.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{row.value}</span>
                  </div>
                  <div style={{ height: '5px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: '3px' }}></div>
                  </div>
                </div>
              ))}
              <a href="/finance" style={{
                display: 'block', textAlign: 'center' as const,
                marginTop: '12px', padding: '8px',
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                borderRadius: '6px', fontSize: '12px',
                fontWeight: '500', color: '#475569',
                textDecoration: 'none'
              }}>View Full Finance Report →</a>
            </div>

            {/* Module status */}
            <div style={{
              background: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '12px', padding: '18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', marginBottom: '12px' }}>
                AI Modules Status
              </div>
              {[
                { name: 'Voice Orders', status: 'Live', color: '#059669', bg: '#F0FDF4' },
                { name: 'FDA Alerts', status: '2 Active', color: '#DC2626', bg: '#FEF2F2' },
                { name: 'Invoice AI', status: 'Ready', color: '#2563EB', bg: '#EFF6FF' },
                { name: 'Finance AI', status: 'Ready', color: '#2563EB', bg: '#EFF6FF' },
                { name: 'Marketing AI', status: 'Setup', color: '#D97706', bg: '#FFFBEB' },
              ].map(m => (
                <div key={m.name} style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '7px 0',
                  borderBottom: '1px solid #F8FAFC'
                }}>
                  <span style={{ fontSize: '13px', color: '#374151' }}>{m.name}</span>
                  <span style={{
                    background: m.bg, color: m.color,
                    fontSize: '11px', fontWeight: '600',
                    padding: '2px 8px', borderRadius: '20px'
                  }}>{m.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}