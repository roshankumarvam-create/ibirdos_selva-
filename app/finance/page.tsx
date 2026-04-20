'use client'
import { useState } from 'react'

export default function FinancePage() {
  const [activeWeek, setActiveWeek] = useState(0)
  const [running, setRunning] = useState(false)
  const [aiDone, setAiDone] = useState(true)

  const weeks = [
    { week: 'Apr 14-18', revenue: 28400, food: 8066, labor: 7384, waste: 312, profit: 6820 },
    { week: 'Apr 7-11', revenue: 24100, food: 7230, labor: 7100, waste: 280, profit: 4890 },
    { week: 'Mar 31-Apr 4', revenue: 22800, food: 6840, labor: 6950, waste: 310, profit: 4200 },
    { week: 'Mar 24-28', revenue: 21500, food: 6450, labor: 6800, waste: 290, profit: 3960 },
  ]

  const current = weeks[activeWeek]
  const foodPct = ((current.food / current.revenue) * 100).toFixed(1)
  const laborPct = ((current.labor / current.revenue) * 100).toFixed(1)
  const wastePct = ((current.waste / current.revenue) * 100).toFixed(1)
  const profitPct = ((current.profit / current.revenue) * 100).toFixed(1)

  async function runAnalysis() {
    setRunning(true)
    setAiDone(false)
    await new Promise(r => setTimeout(r, 2000))
    setRunning(false)
    setAiDone(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #1E3A5F 50%, #0A0F1E 100%)', padding: '32px 32px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.06, fontSize: '80px', display: 'flex', flexWrap: 'wrap' as const, gap: '20px', padding: '10px', userSelect: 'none' as const }}>
          {['$','%','P','L','$','%','P','L','$','%'].map((e, i) => <span key={i} style={{ fontWeight: 700 }}>{e}</span>)}
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#FFFFFF' }}>Finance & P&L</h1>
            <p style={{ fontSize: '14px', color: '#93C5FD', marginTop: '4px' }}>Cafe 71 · Powered by Claude AI · Week of {current.week}, 2026</p>
          </div>
          <button onClick={runAnalysis} disabled={running} style={{ padding: '10px 20px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: 'none', background: running ? '#1E3A5F' : '#2563EB', color: 'white' }}>
            {running ? 'Analyzing...' : 'Run AI Analysis'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginTop: '24px', position: 'relative', zIndex: 1 }}>
          {[
            { label: 'Revenue', value: `$${current.revenue.toLocaleString()}`, color: '#3B82F6', pct: '100%' },
            { label: 'Food Cost', value: `$${current.food.toLocaleString()}`, color: '#F59E0B', pct: `${foodPct}%` },
            { label: 'Labor', value: `$${current.labor.toLocaleString()}`, color: '#8B5CF6', pct: `${laborPct}%` },
            { label: 'Net Profit', value: `$${current.profit.toLocaleString()}`, color: '#10B981', pct: `${profitPct}%` },
          ].map(card => (
            <div key={card.label} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{card.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', margin: '4px 0' }}>{card.value}</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: card.color }}>{card.pct} of revenue</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {weeks.map((w, i) => (
            <button key={i} onClick={() => setActiveWeek(i)} style={{ padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: i === activeWeek ? '600' : '400', background: i === activeWeek ? '#0A0F1E' : '#FFFFFF', color: i === activeWeek ? '#FFFFFF' : '#64748B', border: i === activeWeek ? '1px solid #0A0F1E' : '1px solid #E2E8F0', cursor: 'pointer' }}>{w.week}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A', marginBottom: '20px' }}>P&L Breakdown — {current.week}</h3>
            {[
              { label: 'Total Revenue', value: current.revenue, pct: 100, color: '#3B82F6' },
              { label: 'Food Cost', value: current.food, pct: Number(foodPct), color: '#F59E0B' },
              { label: 'Labor Cost', value: current.labor, pct: Number(laborPct), color: '#8B5CF6' },
              { label: 'Waste Cost', value: current.waste, pct: Number(wastePct), color: '#EF4444' },
              { label: 'Net Profit', value: current.profit, pct: Number(profitPct), color: '#10B981' },
            ].map(row => (
              <div key={row.label} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>{row.label}</span>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>{row.pct.toFixed(1)}%</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>${row.value.toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: '4px' }}></div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '18px' }}>🤖</span>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A' }}>Claude AI Analysis</h3>
              {aiDone && !running && <span style={{ background: '#F0FDF4', color: '#166534', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>Live</span>}
              {running && <span style={{ background: '#FFFBEB', color: '#D97706', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>Analyzing...</span>}
            </div>
            {[
              { icon: '📈', title: 'Revenue up 18%', detail: 'Diwali special menu drove $4,200 extra catering revenue. Re-run cultural event menus monthly.' },
              { icon: '✅', title: 'Food cost excellent', detail: `At ${foodPct}% food cost you are 1.6pts below industry average.` },
              { icon: '⚠️', title: 'Waste needs attention', detail: 'Produce waste up 40% — side salad portions over-spec. Reduce 1oz to save $420/mo.' },
              { icon: '💡', title: 'Profit opportunity', detail: 'Weekend catering package at $850 flat could add $3,400/mo.' },
            ].map((item, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', marginBottom: '3px' }}>{item.title}</div>
                  <div style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A' }}>Weekly P&L History</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Week', 'Revenue', 'Food Cost', 'Labor', 'Waste', 'Net Profit', 'Margin'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' as const, textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((row, i) => (
                <tr key={i} onClick={() => setActiveWeek(i)} style={{ cursor: 'pointer', background: i === activeWeek ? '#EFF6FF' : 'white', borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500', color: '#0F172A' }}>{row.week}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#0F172A' }}>${row.revenue.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#D97706' }}>${row.food.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#7C3AED' }}>${row.labor.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#DC2626' }}>${row.waste}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: '#059669' }}>${row.profit.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: '#F0FDF4', color: '#166534', fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>{((row.profit/row.revenue)*100).toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}