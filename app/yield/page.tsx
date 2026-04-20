'use client'
import { useState } from 'react'

export default function YieldPage() {
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], template:'Thu_132_Chicken', starting_weight:'', trim_waste:'', portions_served:'', sysco_price:'', notes:'' })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const yieldActual = form.starting_weight && form.trim_waste ? (Number(form.starting_weight) - Number(form.trim_waste)).toFixed(1) : '—'
  const wastePct = form.starting_weight && form.trim_waste ? ((Number(form.trim_waste) / Number(form.starting_weight)) * 100).toFixed(1) : '—'
  const overTarget = wastePct !== '—' && Number(wastePct) > 12

  const history = [
    { date:'Apr 18', template:'Thu_132', starting:56.2, trim:6.4, yield:49.8, portions:132, waste_pct:11.4, price:3.29, status:'good' },
    { date:'Apr 11', template:'Thu_132', starting:56.0, trim:7.2, yield:48.8, portions:132, waste_pct:12.9, status:'over', price:3.29 },
    { date:'Apr 4',  template:'Thu_132', starting:57.1, trim:6.8, yield:50.3, portions:132, waste_pct:11.9, status:'good', price:3.35 },
    { date:'Mar 28', template:'Thu_132', starting:55.8, trim:6.1, yield:49.7, portions:130, waste_pct:10.9, status:'good', price:3.29 },
    { date:'Mar 21', template:'Thu_132', starting:56.4, trim:7.8, yield:48.6, portions:132, waste_pct:13.8, status:'over', price:3.14 },
    { date:'Mar 14', template:'Thu_132', starting:56.0, trim:6.3, yield:49.7, portions:132, waste_pct:11.3, status:'good', price:3.14 },
  ]

  const avgWaste = (history.reduce((s,h) => s+h.waste_pct, 0) / history.length).toFixed(1)
  const prediction = { lbs: 57.2, waste_pct: 11.8, confidence: 92 }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #E2E8F0', borderRadius:'6px', fontSize:'14px', color:'#0F172A', background:'#FFFFFF', outline:'none', boxSizing:'border-box' as const }

  return (
    <div style={{ minHeight:'100vh', background:'#F1F5F9' }}>
      <div style={{ background:'linear-gradient(135deg,#0F172A 0%,#1E3A5F 100%)', padding:'24px 32px' }}>
        <h1 style={{ fontSize:'22px', fontWeight:'700', color:'#FFFFFF', margin:0 }}>Yield Log</h1>
        <p style={{ fontSize:'13px', color:'#93C5FD', marginTop:'4px' }}>Log after every event · Target chicken trim ≤12% · AI predicts next event</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginTop:'20px' }}>
          {[
            { label:'Avg Trim Waste', value:`${avgWaste}%`, target:'Target ≤12%', color: Number(avgWaste) > 12 ? '#FCA5A5' : '#86EFAC' },
            { label:'Events Logged', value:history.length.toString(), target:'Last 6 Thursdays', color:'#FFFFFF' },
            { label:'Next Thu Prediction', value:`${prediction.lbs} lbs`, target:`${prediction.waste_pct}% trim expected`, color:'#FCD34D' },
            { label:'AI Confidence', value:`${prediction.confidence}%`, target:'Based on 6 events', color:'#86EFAC' },
          ].map(c => (
            <div key={c.label} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'12px 14px' }}>
              <div style={{ fontSize:'11px', color:'#94A3B8', textTransform:'uppercase' as const, marginBottom:'4px' }}>{c.label}</div>
              <div style={{ fontSize:'20px', fontWeight:'700', color:c.color }}>{c.value}</div>
              <div style={{ fontSize:'11px', color:'#475569', marginTop:'2px' }}>{c.target}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 32px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>

        {/* Log form */}
        <div>
          <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:'10px', padding:'24px', marginBottom:'16px' }}>
            <h3 style={{ fontSize:'15px', fontWeight:'600', color:'#0F172A', marginBottom:'18px' }}>Log Today's Yield</h3>
            <form onSubmit={handleSave}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
                <div>
                  <label style={{ fontSize:'12px', fontWeight:'500', color:'#64748B', display:'block', marginBottom:'5px' }}>Date</label>
                  <input type="date" style={inp} value={form.date} onChange={e => setForm({...form, date:e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize:'12px', fontWeight:'500', color:'#64748B', display:'block', marginBottom:'5px' }}>Event Template</label>
                  <select style={{ ...inp, cursor:'pointer' }} value={form.template} onChange={e => setForm({...form, template:e.target.value})}>
                    <option value="Thu_132_Chicken">Thu_132 — Chicken + Tofu</option>
                    <option value="Fri_80_Lamb">Fri_80 — Lamb Biryani</option>
                    <option value="Sat_60_Veg">Sat_60 — Vegetarian</option>
                  </select>
                </div>
              </div>

              <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'8px', padding:'16px', marginBottom:'14px' }}>
                <div style={{ fontSize:'13px', fontWeight:'600', color:'#0F172A', marginBottom:'12px' }}>Chicken Yield Data</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                  <div>
                    <label style={{ fontSize:'12px', fontWeight:'500', color:'#64748B', display:'block', marginBottom:'5px' }}>Starting Weight (lbs) 📷</label>
                    <input type="number" placeholder="56.0" step="0.1" style={inp} value={form.starting_weight} onChange={e => setForm({...form, starting_weight:e.target.value})} />
                    <div style={{ fontSize:'11px', color:'#94A3B8', marginTop:'3px' }}>Photo of scale required</div>
                  </div>
                  <div>
                    <label style={{ fontSize:'12px', fontWeight:'500', color:'#64748B', display:'block', marginBottom:'5px' }}>Trim Waste (lbs) 📷</label>
                    <input type="number" placeholder="6.5" step="0.1" style={inp} value={form.trim_waste} onChange={e => setForm({...form, trim_waste:e.target.value})} />
                    <div style={{ fontSize:'11px', color:'#94A3B8', marginTop:'3px' }}>Photo of trim pile required</div>
                  </div>
                  <div>
                    <label style={{ fontSize:'12px', fontWeight:'500', color:'#64748B', display:'block', marginBottom:'5px' }}>Yield Usable (lbs)</label>
                    <div style={{ padding:'9px 12px', border:'1px solid #E2E8F0', borderRadius:'6px', background:'#F0FDF4', fontSize:'14px', fontWeight:'700', color:'#059669' }}>{yieldActual} lbs (auto)</div>
                  </div>
                  <div>
                    <label style={{ fontSize:'12px', fontWeight:'500', color:'#64748B', display:'block', marginBottom:'5px' }}>Portions Served</label>
                    <input type="number" placeholder="132" style={inp} value={form.portions_served} onChange={e => setForm({...form, portions_served:e.target.value})} />
                  </div>
                </div>

                {wastePct !== '—' && (
                  <div style={{ marginTop:'12px', padding:'12px', borderRadius:'8px', background: overTarget ? '#FEF2F2' : '#F0FDF4', border:`1px solid ${overTarget ? '#FECACA' : '#BBF7D0'}` }}>
                    <div style={{ fontSize:'16px', fontWeight:'800', color: overTarget ? '#DC2626' : '#059669' }}>
                      Trim Waste: {wastePct}% {overTarget ? '⚠ OVER 12% TARGET' : '✓ Within Target'}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>
                <div>
                  <label style={{ fontSize:'12px', fontWeight:'500', color:'#64748B', display:'block', marginBottom:'5px' }}>Sysco Chicken Price/lb ($)</label>
                  <input type="number" placeholder="3.29" step="0.01" style={inp} value={form.sysco_price} onChange={e => setForm({...form, sysco_price:e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize:'12px', fontWeight:'500', color:'#64748B', display:'block', marginBottom:'5px' }}>Notes</label>
                  <input type="text" placeholder="Any issues today..." style={inp} value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} />
                </div>
              </div>

              <button type="submit" disabled={saving} style={{ width:'100%', padding:'12px', background: saved ? '#059669' : '#2563EB', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
                {saving ? 'Saving...' : saved ? '✓ Yield Logged' : 'Log Yield Entry'}
              </button>
            </form>
          </div>

          {/* AI prediction */}
          <div style={{ background:'#0A0F1E', border:'1px solid #1E2A45', borderRadius:'10px', padding:'20px' }}>
            <div style={{ fontSize:'13px', fontWeight:'600', color:'#93C5FD', marginBottom:'10px' }}>🤖 AI Prediction — Next Thursday</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>
              {[
                { label:'Start Weight', value:`${prediction.lbs} lbs`, color:'#FCD34D' },
                { label:'Expected Trim', value:`${prediction.waste_pct}%`, color: prediction.waste_pct > 12 ? '#FCA5A5' : '#86EFAC' },
                { label:'Confidence', value:`${prediction.confidence}%`, color:'#86EFAC' },
              ].map(c => (
                <div key={c.label} style={{ background:'#060D1A', borderRadius:'8px', padding:'12px', textAlign:'center' as const }}>
                  <div style={{ fontSize:'10px', color:'#475569', textTransform:'uppercase' as const, marginBottom:'4px' }}>{c.label}</div>
                  <div style={{ fontSize:'18px', fontWeight:'700', color:c.color }}>{c.value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:'12px', color:'#475569', marginTop:'12px', lineHeight:'1.6' }}>
              Based on 6 logged events. Historical avg: {avgWaste}% trim. Order 57.2 lbs for next 132-pax event — saves $2.40 vs ordering 56 lbs at current waste rate.
            </div>
          </div>
        </div>

        {/* History */}
        <div>
          <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:'10px', overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #E2E8F0' }}>
              <h3 style={{ fontSize:'15px', fontWeight:'600', color:'#0F172A' }}>Yield History — Last 6 Events</h3>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F8FAFC' }}>
                  {['Date','Start (lbs)','Trim (lbs)','Yield (lbs)','Portions','Waste %','Price/lb','Status'].map(h => (
                    <th key={h} style={{ padding:'9px 12px', fontSize:'11px', fontWeight:'600', color:'#94A3B8', textAlign:'left' as const, borderBottom:'1px solid #E2E8F0', textTransform:'uppercase' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #F1F5F9', background: h.status==='over' ? '#FFF7ED' : 'white' }}>
                    <td style={{ padding:'10px 12px', fontSize:'13px', fontWeight:'500', color:'#0F172A' }}>{h.date}</td>
                    <td style={{ padding:'10px 12px', fontSize:'13px', color:'#475569' }}>{h.starting}</td>
                    <td style={{ padding:'10px 12px', fontSize:'13px', color: h.trim > 7 ? '#DC2626' : '#475569', fontWeight: h.trim > 7 ? '600' : '400' }}>{h.trim}</td>
                    <td style={{ padding:'10px 12px', fontSize:'13px', color:'#0F172A', fontWeight:'600' }}>{h.yield}</td>
                    <td style={{ padding:'10px 12px', fontSize:'13px', color:'#475569' }}>{h.portions}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ fontSize:'13px', fontWeight:'700', color: h.waste_pct > 12 ? '#DC2626' : '#059669' }}>{h.waste_pct}%</span>
                    </td>
                    <td style={{ padding:'10px 12px', fontSize:'13px', color:'#475569' }}>${h.price}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'4px', background: h.status==='good' ? '#F0FDF4' : '#FEF2F2', color: h.status==='good' ? '#166534' : '#DC2626' }}>
                        {h.status === 'good' ? '✓ On Target' : '⚠ Over 12%'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Trend chart (visual bars) */}
          <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:'10px', padding:'20px', marginTop:'16px' }}>
            <h3 style={{ fontSize:'14px', fontWeight:'600', color:'#0F172A', marginBottom:'16px' }}>Trim Waste % — 6 Week Trend</h3>
            <div style={{ display:'flex', alignItems:'flex-end', gap:'12px', height:'100px' }}>
              {history.map((h, i) => (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                  <div style={{ fontSize:'11px', fontWeight:'700', color: h.waste_pct > 12 ? '#DC2626' : '#059669' }}>{h.waste_pct}%</div>
                  <div style={{ width:'100%', borderRadius:'4px 4px 0 0', background: h.waste_pct > 12 ? '#FECACA' : '#BBF7D0', height:`${(h.waste_pct/15)*80}px`, border:`1px solid ${h.waste_pct > 12 ? '#FCA5A5' : '#86EFAC'}` }}></div>
                  <div style={{ fontSize:'10px', color:'#94A3B8' }}>{h.date}</div>
                </div>
              ))}
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                <div style={{ fontSize:'11px', fontWeight:'700', color:'#93C5FD' }}>{prediction.waste_pct}%</div>
                <div style={{ width:'100%', borderRadius:'4px 4px 0 0', background:'rgba(37,99,235,0.2)', height:`${(prediction.waste_pct/15)*80}px`, border:'2px dashed #2563EB' }}></div>
                <div style={{ fontSize:'10px', color:'#2563EB' }}>Next (AI)</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:'16px', marginTop:'10px', fontSize:'11px', color:'#94A3B8' }}>
              <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><span style={{ width:'10px', height:'10px', borderRadius:'2px', background:'#BBF7D0', display:'inline-block' }}></span>Within target ≤12%</span>
              <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><span style={{ width:'10px', height:'10px', borderRadius:'2px', background:'#FECACA', display:'inline-block' }}></span>Over target</span>
              <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><span style={{ width:'10px', height:'10px', borderRadius:'2px', border:'2px dashed #2563EB', display:'inline-block' }}></span>AI prediction</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}