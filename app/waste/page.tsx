'use client'
import { useState } from 'react'

export default function WastePage() {
  const [view, setView] = useState<'log'|'history'|'analytics'>('log')
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    station: '', category: '', item: '',
    qty_lbs: '', unit: 'lbs', reason: '',
    staff: '', cost_per_lb: '', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [entries, setEntries] = useState([
    { id: 1, date: 'Apr 19', station: 'Grill', category: 'Protein', item: 'Chicken Thigh', qty: 2.4, unit: 'lbs', reason: 'Over-trimmed', staff: 'Chef Mike', cost: 7.90, gl: 'IB-6001' },
    { id: 2, date: 'Apr 19', station: 'Prep', category: 'Produce', item: 'Romaine — FDA RECALL', qty: 8.0, unit: 'lbs', reason: 'FDA Recall Removal', staff: 'Chef Mike', cost: 24.00, gl: 'IB-6001', alert: true },
    { id: 3, date: 'Apr 18', station: 'Line', category: 'Produce', item: 'Tomatoes', qty: 1.8, unit: 'lbs', reason: 'Overripe', staff: 'Chef Ana', cost: 3.60, gl: 'IB-6001' },
    { id: 4, date: 'Apr 18', station: 'Bakery', category: 'Dairy', item: 'Cream HVY WHP 40%', qty: 0.9, unit: 'lbs', reason: 'Expired', staff: 'Chef Sam', cost: 3.68, gl: 'IB-6001' },
  ])

  const stations = ['Grill', 'Prep', 'Line', 'Bakery', 'Fry Station', 'Cold Side', 'BOH Storage', 'FOH']
  const categories = [
    { name: 'Protein', gl: 'IB-4111', color: '#EF4444' },
    { name: 'Produce', gl: 'IB-4114', color: '#10B981' },
    { name: 'Dairy', gl: 'IB-4113', color: '#3B82F6' },
    { name: 'Grocery', gl: 'IB-4112', color: '#F59E0B' },
    { name: 'Seafood', gl: 'IB-4115', color: '#8B5CF6' },
    { name: 'Prepared', gl: 'IB-4112', color: '#EC4899' },
  ]
  const reasons = ['Over-trimmed', 'Expired/Spoiled', 'Overcooked', 'Dropped', 'FDA Recall Removal', 'Wrong prep', 'Customer return', 'Overproduced', 'Other']
  const units = ['lbs', 'oz', 'kg', 'each', 'portion', 'case']

  const totalWaste = entries.reduce((s, e) => s + e.cost, 0)
  const totalLbs = entries.reduce((s, e) => s + e.qty, 0)
  const selectedCatGL = categories.find(c => c.name === form.category)?.gl || 'IB-6001'
  const estimatedCost = Number(form.qty_lbs || 0) * Number(form.cost_per_lb || 0)

  async function handleSave() {
    if (!form.station || !form.category || !form.item || !form.qty_lbs) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 700))
    const newEntry = {
      id: entries.length + 1,
      date: 'Today',
      station: form.station,
      category: form.category,
      item: form.item,
      qty: Number(form.qty_lbs),
      unit: form.unit,
      reason: form.reason,
      staff: form.staff,
      cost: estimatedCost,
      gl: selectedCatGL,
      alert: false
    }
    setEntries([newEntry, ...entries])
    setForm({ date: new Date().toISOString().split('T')[0], station: '', category: '', item: '', qty_lbs: '', unit: 'lbs', reason: '', staff: '', cost_per_lb: '', notes: '' })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '14px', color: '#0F172A', background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' as const }
  const sel = { ...inp, cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', padding: '24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>Waste Log</h1>
            <p style={{ fontSize: '13px', color: '#93C5FD', marginTop: '4px' }}>Desktop + Mobile · GL IB-6001 · Posts to food waste system</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['log', 'history', 'analytics'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none', background: view === v ? '#2563EB' : 'rgba(255,255,255,0.1)', color: 'white', textTransform: 'capitalize' as const }}>{v}</button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginTop: '20px' }}>
          {[
            { label: 'Waste Cost Today', value: `$${totalWaste.toFixed(2)}`, color: '#FCA5A5', sub: 'Target < $96/day' },
            { label: 'Total Weight', value: `${totalLbs.toFixed(1)} lbs`, color: '#FCD34D', sub: 'Today' },
            { label: 'Waste %', value: `${((totalWaste / 28400) * 100).toFixed(2)}%`, color: totalWaste/28400 > 0.02 ? '#FCA5A5' : '#86EFAC', sub: 'Target < 2%' },
            { label: 'GL Code', value: 'IB-6001', color: '#93C5FD', sub: 'Food waste written off' },
          ].map(c => (
            <div key={c.label} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase' as const, marginBottom: '4px' }}>{c.label}</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: c.color }}>{c.value}</div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>

        {view === 'log' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>

            {/* Entry form */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A', marginBottom: '20px' }}>Log Waste Entry</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Date</label>
                  <input type="date" style={inp} value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Station</label>
                  <select style={sel} value={form.station} onChange={e => setForm({...form, station: e.target.value})}>
                    <option value="">Select station...</option>
                    {stations.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Category tiles */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '8px' }}>Category & GL Code</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                  {categories.map(cat => (
                    <button key={cat.name} onClick={() => setForm({...form, category: cat.name})} style={{
                      padding: '10px 8px', borderRadius: '8px', cursor: 'pointer',
                      border: form.category === cat.name ? `2px solid ${cat.color}` : '1px solid #E2E8F0',
                      background: form.category === cat.name ? `${cat.color}15` : '#FFFFFF',
                      textAlign: 'center' as const
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: form.category === cat.name ? cat.color : '#374151' }}>{cat.name}</div>
                      <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>{cat.gl}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Item Name</label>
                <input type="text" placeholder="e.g. Chicken Thigh, Romaine Lettuce..." style={inp} value={form.item} onChange={e => setForm({...form, item: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Quantity</label>
                  <input type="number" placeholder="0.0" style={inp} value={form.qty_lbs} onChange={e => setForm({...form, qty_lbs: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Unit</label>
                  <select style={sel} value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Cost per unit ($)</label>
                  <input type="number" placeholder="0.00" style={inp} value={form.cost_per_lb} onChange={e => setForm({...form, cost_per_lb: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Reason</label>
                  <select style={sel} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}>
                    <option value="">Select reason...</option>
                    {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Staff Name</label>
                  <input type="text" placeholder="Chef name..." style={inp} value={form.staff} onChange={e => setForm({...form, staff: e.target.value})} />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Notes (optional)</label>
                <textarea placeholder="Additional notes..." style={{ ...inp, height: '60px', resize: 'vertical' as const }} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>

              {/* Cost estimate */}
              {estimatedCost > 0 && (
                <div style={{ background: '#FFF7ED', border: '1px solid #FDE68A', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#92400E' }}>Estimated waste cost</span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#DC2626' }}>${estimatedCost.toFixed(2)}</span>
                </div>
              )}

              {/* GL info */}
              {form.category && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#1E40AF' }}>GL posting: <strong>{selectedCatGL}</strong> Food Waste Written Off</span>
                  <span style={{ fontSize: '12px', color: '#1E40AF' }}>+ <strong>IB-6001</strong> Waste Expense</span>
                </div>
              )}

              <button onClick={handleSave} disabled={saving || !form.station || !form.category || !form.item || !form.qty_lbs} style={{
                width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
                border: 'none', cursor: 'pointer',
                background: saved ? '#059669' : (!form.station || !form.category || !form.item || !form.qty_lbs) ? '#E2E8F0' : '#DC2626',
                color: (!form.station || !form.category || !form.item || !form.qty_lbs) ? '#94A3B8' : 'white'
              }}>
                {saving ? 'Logging...' : saved ? '✓ Waste Logged + Posted to System' : 'Log Waste Entry'}
              </button>
            </div>

            {/* Right panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Category breakdown */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', marginBottom: '14px' }}>Category Breakdown</div>
                {categories.map(cat => {
                  const catEntries = entries.filter(e => e.category === cat.name)
                  const catCost = catEntries.reduce((s, e) => s + e.cost, 0)
                  const catLbs = catEntries.reduce((s, e) => s + e.qty, 0)
                  if (catCost === 0) return null
                  return (
                    <div key={cat.name} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color }}></div>
                          <span style={{ fontSize: '13px', color: '#374151' }}>{cat.name}</span>
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>{catLbs.toFixed(1)} lbs</span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#DC2626' }}>${catCost.toFixed(2)}</span>
                      </div>
                      <div style={{ height: '4px', background: '#F1F5F9', borderRadius: '2px' }}>
                        <div style={{ height: '100%', width: `${(catCost / totalWaste) * 100}%`, background: cat.color, borderRadius: '2px' }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* AI insight */}
              <div style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1E40AF', marginBottom: '6px' }}>🤖 Clow AI Waste Analysis</div>
                <div style={{ fontSize: '13px', color: '#1E40AF', lineHeight: '1.6' }}>
                  Produce waste is 60% of today's total. FDA Recall removal of Romaine ($24.00) is the biggest driver. Chicken trim at 2.4 lbs is within target (&lt;12%). Consider reducing side salad portions by 1oz to save ~$420/month.
                </div>
              </div>

              {/* Recent entries */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', fontSize: '14px', fontWeight: '600', color: '#0F172A' }}>Recent Entries</div>
                {entries.slice(0, 5).map(e => (
                  <div key={e.id} style={{ padding: '11px 16px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: '10px', background: e.alert ? '#FFF7ED' : 'white' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: categories.find(c => c.name === e.category)?.color || '#64748B', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#0F172A' }}>
                        {e.item} {e.alert && <span style={{ background: '#FEF2F2', color: '#DC2626', fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', marginLeft: '4px' }}>FDA</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{e.station} · {e.reason} · {e.staff}</div>
                    </div>
                    <div style={{ textAlign: 'right' as const }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#DC2626' }}>${e.cost.toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{e.qty} {e.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A' }}>Waste History</h3>
              <button style={{ padding: '6px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>Export PDF</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Date', 'Station', 'Item', 'Category', 'GL Code', 'Qty', 'Cost', 'Reason', 'Staff'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '600', color: '#94A3B8', textAlign: 'left', borderBottom: '1px solid #E2E8F0', textTransform: 'uppercase' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #F1F5F9', background: e.alert ? '#FFF7ED' : 'white' }}>
                    <td style={{ padding: '11px 14px', fontSize: '13px', color: '#64748B' }}>{e.date}</td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', color: '#0F172A' }}>{e.station}</td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: '500', color: '#0F172A' }}>
                      {e.item} {e.alert && <span style={{ background: '#FEF2F2', color: '#DC2626', fontSize: '10px', fontWeight: '700', padding: '1px 5px', borderRadius: '3px' }}>FDA</span>}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: `${categories.find(c=>c.name===e.category)?.color || '#64748B'}15`, color: categories.find(c=>c.name===e.category)?.color || '#64748B', fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>{e.category}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <code style={{ fontSize: '12px', color: '#2563EB', background: '#EFF6FF', padding: '2px 6px', borderRadius: '4px' }}>{e.gl}</code>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', color: '#475569' }}>{e.qty} {e.unit}</td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: '700', color: '#DC2626' }}>${e.cost.toFixed(2)}</td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: '#64748B' }}>{e.reason}</td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: '#64748B' }}>{e.staff}</td>
                  </tr>
                ))}
                <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
                  <td colSpan={6} style={{ padding: '12px 14px', fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>Total</td>
                  <td style={{ padding: '12px 14px', fontSize: '15px', fontWeight: '700', color: '#DC2626' }}>${totalWaste.toFixed(2)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {view === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
            {[
              { label: 'This Week Waste', value: '$312', target: '$280', pct: 112, color: '#EF4444', icon: '♻️' },
              { label: 'Avg Daily Waste', value: '$44.57', target: '$40', pct: 111, color: '#F59E0B', icon: '📊' },
              { label: 'Chicken Trim %', value: '11.8%', target: '< 12%', pct: 98, color: '#10B981', icon: '🐔' },
              { label: 'Waste % of Revenue', value: '1.1%', target: '< 2%', pct: 55, color: '#10B981', icon: '📈' },
              { label: 'Top Waste Category', value: 'Produce', target: 'Watch', pct: 60, color: '#F59E0B', icon: '🥬' },
              { label: 'AI Savings Potential', value: '$420/mo', target: 'Reduce salad 1oz', pct: 100, color: '#2563EB', icon: '🤖' },
            ].map(card => (
              <div key={card.label} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' as const }}>{card.label}</span>
                  <span style={{ fontSize: '20px' }}>{card.icon}</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>{card.value}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '10px' }}>Target: {card.target}</div>
                <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '3px' }}>
                  <div style={{ height: '100%', width: `${Math.min(card.pct, 100)}%`, background: card.color, borderRadius: '3px' }}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}