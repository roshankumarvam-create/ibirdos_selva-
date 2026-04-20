'use client'
import { useState } from 'react'

// iBirdOS Standard GL Codes
const GL = {
  BREAKFAST:   { code: 'IB-3100', desc: 'Food Sales — Breakfast' },
  LUNCH:       { code: 'IB-3101', desc: 'Food Sales — Lunch' },
  DINNER:      { code: 'IB-3102', desc: 'Food Sales — Dinner' },
  BEVERAGE:    { code: 'IB-3103', desc: 'Food Sales — Beverage & Snacks' },
  CATERING:    { code: 'IB-3104', desc: 'Food Sales — Catering' },
  RETAIL:      { code: 'IB-3105', desc: 'Food Sales — Market & Retail' },
  GIFT_SOLD:   { code: 'IB-2300', desc: 'Gift Card Liability' },
  MEAL_PLAN:   { code: 'IB-2301', desc: 'Meal Plan Liability' },
  SALES_TAX:   { code: 'IB-2221', desc: 'Sales Tax Payable' },
  CARD:        { code: 'IB-1701', desc: 'Card Clearing' },
  CASH:        { code: 'IB-1702', desc: 'Cash — Depository' },
  DEBIT:       { code: 'IB-1703', desc: 'Debit Card Clearing' },
  GIFT_RED:    { code: 'IB-2300', desc: 'Gift Card Redemption' },
  EMP_DISC:    { code: 'IB-3200', desc: 'Employee Discount — Contra Revenue' },
  COMP:        { code: 'IB-3201', desc: 'Comps & Voids — Contra Revenue' },
  CORP_AR:     { code: 'IB-1756', desc: 'Corporate Account Receivable' },
  ROUNDING:    { code: 'IB-6531', desc: 'Rounding Adjustment' },
  MEAL_RED:    { code: 'IB-2301', desc: 'Meal Plan Redemption' },
}

// iBirdOS Business Tiers + Unit IDs
const UNITS = [
  { id: 'SC-71001', name: 'Cafe 71', location: 'Redmond WA', tier: 'Solo Chef',   tierColor: '#8B5CF6' },
  { id: 'SC-71002', name: 'Spice Route Kitchen', location: 'Issaquah WA', tier: 'Solo Chef', tierColor: '#8B5CF6' },
  { id: 'RS-10001', name: 'Cafe 71 Redmond', location: 'Redmond WA', tier: 'Restaurant', tierColor: '#2563EB' },
  { id: 'RS-10002', name: 'Issaquah Bistro', location: 'Issaquah WA', tier: 'Restaurant', tierColor: '#2563EB' },
  { id: 'MU-20001', name: 'ANS Pacific Group', location: 'Seattle Metro', tier: 'Multi Unit', tierColor: '#059669' },
  { id: 'MU-20002', name: 'Coastal Eats Group', location: 'WA + OR', tier: 'Multi Unit', tierColor: '#059669' },
  { id: 'FR-30001', name: 'Spice Route — Unit 1', location: 'Bellevue WA', tier: 'Franchise', tierColor: '#D97706' },
  { id: 'FR-30002', name: 'Spice Route — Unit 2', location: 'Kirkland WA', tier: 'Franchise', tierColor: '#D97706' },
  { id: 'EN-40001', name: 'ANS Corporation', location: 'HQ — Redmond WA', tier: 'Enterprise', tierColor: '#DC2626' },
  { id: 'EN-40002', name: 'Prosperity Axis', location: 'HQ — Redmond WA', tier: 'Enterprise', tierColor: '#DC2626' },
]

const TIERS = ['Solo Chef', 'Restaurant', 'Multi Unit', 'Franchise', 'Enterprise']

const TIER_ICONS: Record<string, string> = {
  'Solo Chef': 'SC',
  'Restaurant': 'RS',
  'Multi Unit': 'MU',
  'Franchise': 'FR',
  'Enterprise': 'EN',
}

export default function SalesPage() {
  const [unitId, setUnitId] = useState('RS-10001')
  const [period, setPeriod] = useState('P7')
  const [week, setWeek] = useState('4')
  const [activeTab, setActiveTab] = useState<'sales' | 'tenders'>('sales')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [noSaleDay, setNoSaleDay] = useState(false)

  const [sales, setSales] = useState({
    breakfast_sales: '', breakfast_count: '',
    lunch_sales: '', lunch_count: '',
    dinner_sales: '', dinner_count: '',
    beverage_sales: '', beverage_count: '',
    catering_sales: '', catering_count: '',
    retail_sales: '', retail_count: '',
    gift_sold: '',
    meal_plan: '',
    sales_tax: '',
    void_amount: '', void_count: '',
    refund_amount: '', refund_count: '',
    discount_amount: '', discount_count: '',
  })

  const [tenders, setTenders] = useState({
    visa_mc: '', amex: '', discover: '', mastercard: '',
    debit: '', cash: '',
    gift_redeemed: '', emp_discount: '', comp_void: '',
    corp_ar: '', rounding: '', meal_redeemed: '',
  })

  const SALES_ITEMS = [
    { key: 'breakfast_sales', countKey: 'breakfast_count', label: 'Breakfast Sales', gl: GL.BREAKFAST, color: '#F59E0B' },
    { key: 'lunch_sales',     countKey: 'lunch_count',     label: 'Lunch Sales',     gl: GL.LUNCH,      color: '#3B82F6' },
    { key: 'dinner_sales',    countKey: 'dinner_count',    label: 'Dinner Sales',    gl: GL.DINNER,     color: '#8B5CF6' },
    { key: 'beverage_sales',  countKey: 'beverage_count',  label: 'Beverage & Snacks', gl: GL.BEVERAGE, color: '#10B981' },
    { key: 'catering_sales',  countKey: 'catering_count',  label: 'Catering Revenue',  gl: GL.CATERING, color: '#06B6D4' },
    { key: 'retail_sales',    countKey: 'retail_count',    label: 'Market & Retail',   gl: GL.RETAIL,   color: '#64748B' },
    { key: 'gift_sold',       countKey: null,              label: 'Gift Cards Sold',   gl: GL.GIFT_SOLD, color: '#EC4899' },
    { key: 'meal_plan',       countKey: null,              label: 'Meal Plans Sold',   gl: GL.MEAL_PLAN, color: '#F97316' },
  ]

  const TENDER_ITEMS = [
    { key: 'visa_mc',      label: 'Visa / MC',             gl: GL.CARD   },
    { key: 'amex',         label: 'American Express',       gl: GL.CARD   },
    { key: 'discover',     label: 'Discover',               gl: GL.CARD   },
    { key: 'mastercard',   label: 'MasterCard',             gl: GL.CARD   },
    { key: 'debit',        label: 'Debit Card',             gl: GL.DEBIT  },
    { key: 'cash',         label: 'Cash',                   gl: GL.CASH   },
    { key: 'gift_redeemed',label: 'Gift Card Redeemed',     gl: GL.GIFT_RED },
    { key: 'emp_discount', label: 'Employee Discount',      gl: GL.EMP_DISC },
    { key: 'comp_void',    label: 'Comps & Voids',          gl: GL.COMP   },
    { key: 'corp_ar',      label: 'Corporate Account AR',   gl: GL.CORP_AR },
    { key: 'rounding',     label: 'Rounding Adjustment',    gl: GL.ROUNDING },
    { key: 'meal_redeemed',label: 'Meal Plan Redeemed',     gl: GL.MEAL_RED },
  ]

  const totalSales = SALES_ITEMS.reduce((s, i) => s + Number((sales as any)[i.key] || 0), 0) + Number(sales.sales_tax || 0)
  const totalTenders = TENDER_ITEMS.reduce((s, i) => s + Number((tenders as any)[i.key] || 0), 0)
  const variance = totalSales - totalTenders
  const balanced = Math.abs(variance) < 0.01

  const currentUnit = UNITS.find(u => u.id === unitId) || UNITS[2]

  async function handlePost() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 900))
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const inp = {
    width: '100%', padding: '7px 10px',
    border: '1px solid #E2E8F0', borderRadius: '5px',
    fontSize: '14px', color: '#0F172A',
    background: '#FFFFFF', outline: 'none',
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums' as const,
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9' }}>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E3A5F 60%,#0F2744 100%)', padding: '0', position: 'relative', overflow: 'hidden', height: '140px' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, fontSize: '56px', display: 'flex', flexWrap: 'wrap' as const, gap: '18px', padding: '10px', userSelect: 'none' as const }}>
          {['$','%','$','%','$','%','$','%'].map((e,i) => <span key={i} style={{ fontWeight: 700 }}>{e}</span>)}
        </div>
        <div style={{ position: 'relative', zIndex: 1, padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>Daily Sales Entry</h1>
            <p style={{ fontSize: '13px', color: '#93C5FD', marginTop: '4px' }}>
              iBirdOS GL Coded · Posts to accounting · {currentUnit.name}
            </p>
          </div>
          <div style={{ textAlign: 'right' as const }}>
            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '2px', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Total Sales</div>
            <div style={{ fontSize: '30px', fontWeight: '700', color: noSaleDay ? '#475569' : '#FFFFFF', fontVariantNumeric: 'tabular-nums' as const }}>
              ${noSaleDay ? '0.00' : totalSales.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 32px' }}>

        {/* ── Controls bar ── */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>

          {/* Unit selector */}
          <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #F1F5F9' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>
              Unit / Business
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
              {TIERS.map(tier => {
                const tierUnits = UNITS.filter(u => u.tier === tier)
                const tierColor = tierUnits[0]?.tierColor || '#64748B'
                const active = tierUnits.some(u => u.id === unitId)
                return (
                  <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: '700', padding: '2px 8px',
                      borderRadius: '4px', background: active ? tierColor : '#F1F5F9',
                      color: active ? 'white' : '#94A3B8'
                    }}>{TIER_ICONS[tier]}</span>
                    <select
                      value={tierUnits.some(u => u.id === unitId) ? unitId : ''}
                      onChange={e => e.target.value && setUnitId(e.target.value)}
                      style={{ padding: '6px 10px', border: `1px solid ${active ? tierColor : '#E2E8F0'}`, borderRadius: '6px', fontSize: '13px', color: active ? tierColor : '#94A3B8', background: active ? `${tierColor}08` : '#FAFAFA', cursor: 'pointer', fontWeight: active ? '600' : '400' }}
                    >
                      <option value="">{tier}</option>
                      {tierUnits.map(u => (
                        <option key={u.id} value={u.id}>{u.id} · {u.name}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
            {/* Active unit badge */}
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: currentUnit.tierColor, color: 'white' }}>
                {currentUnit.tier}
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{currentUnit.name}</span>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>{currentUnit.location}</span>
              <code style={{ fontSize: '11px', color: currentUnit.tierColor, background: `${currentUnit.tierColor}15`, padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>{currentUnit.id}</code>
            </div>
          </div>

          {/* Period / Week / Date / Actions */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' as const }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>Period</label>
              <select value={period} onChange={e => setPeriod(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '14px', color: '#0F172A', background: '#FFFFFF', cursor: 'pointer' }}>
                {Array.from({length: 13}, (_, i) => `P${i+1}`).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>Week</label>
              <select value={week} onChange={e => setWeek(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '14px', color: '#0F172A', background: '#FFFFFF', cursor: 'pointer' }}>
                {['1','2','3','4','5'].map(w => <option key={w} value={w}>Wk {w}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>Date</label>
              <input type="date" defaultValue={new Date().toISOString().split('T')[0]} style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '14px', color: '#0F172A' }} />
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button onClick={() => setNoSaleDay(!noSaleDay)} style={{ padding: '9px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', background: noSaleDay ? '#FEF2F2' : '#F8FAFC', color: noSaleDay ? '#DC2626' : '#475569', border: noSaleDay ? '1px solid #FECACA' : '1px solid #E2E8F0' }}>
                {noSaleDay ? 'No Sale Day ON' : 'No Sale Day'}
              </button>
              <button onClick={handlePost} disabled={saving} style={{ padding: '9px 22px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', border: 'none', background: saved ? '#059669' : '#2563EB', color: 'white' }}>
                {saving ? 'Posting...' : saved ? 'Posted' : `Post ${currentUnit.name.split(' ')[0]}`}
              </button>
            </div>
          </div>
        </div>

        {noSaleDay && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#DC2626', fontWeight: '500' }}>
            No Sale Day — Recorded as $0. Alert sent from noreply@ibirdos.com to CEO@prosperityaxis.com
          </div>
        )}

        {/* ── Readings ── */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '18px 20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', marginBottom: '12px' }}>Readings</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
            {[
              { label: 'Daily Sales Reading', key: null, isReading: true },
              { label: 'Void Amount / Count', key: 'void', isReading: false },
              { label: 'Refund Amount / Count', key: 'refund', isReading: false },
              { label: 'Discount Amount / Count', key: 'discount', isReading: false },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontSize: '11px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                {f.isReading ? (
                  <input type="number" placeholder="$0.00" style={inp} />
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px' }}>
                    <input type="number" placeholder="$0.00" style={inp}
                      value={(sales as any)[`${f.key}_amount`]}
                      onChange={e => setSales({ ...sales, [`${f.key}_amount`]: e.target.value })} />
                    <input type="number" placeholder="0" style={{ ...inp, textAlign: 'center' as const }}
                      value={(sales as any)[`${f.key}_count`]}
                      onChange={e => setSales({ ...sales, [`${f.key}_count`]: e.target.value })} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div style={{ display: 'flex', background: '#FFFFFF', border: '1px solid #E2E8F0', borderBottom: 'none', borderRadius: '10px 10px 0 0', overflow: 'hidden' }}>
          {(['sales','tenders'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '13px 20px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', background: activeTab === tab ? '#FFFFFF' : '#F8FAFC', color: activeTab === tab ? '#2563EB' : '#64748B', borderBottom: activeTab === tab ? '2px solid #2563EB' : '2px solid transparent' }}>
              {tab === 'sales' ? 'Sales Items' : 'Payments Received (Tenders)'}
            </button>
          ))}
        </div>

        {/* ── Sales Items tab ── */}
        {activeTab === 'sales' && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Sales Item', 'iBirdOS GL Code', 'Sales Amount', 'Count'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#94A3B8', textAlign: i >= 2 ? 'right' as const : 'left' as const, borderBottom: '1px solid #E2E8F0', textTransform: 'uppercase' as const, letterSpacing: '0.05em', width: i === 2 ? '170px' : i === 3 ? '110px' : 'auto' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SALES_ITEMS.map((item, i) => (
                  <tr key={item.key} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '4px', height: '22px', borderRadius: '2px', background: item.color, flexShrink: 0 }}></div>
                        <span style={{ fontSize: '14px', color: '#0F172A', fontWeight: '500' }}>{item.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ fontSize: '12px', fontWeight: '700', color: '#2563EB', background: '#EFF6FF', padding: '3px 8px', borderRadius: '5px', letterSpacing: '0.03em' }}>{item.gl.code}</code>
                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>{item.gl.desc}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '13px' }}>$</span>
                        <input type="number" placeholder="0.00" style={{ ...inp, paddingLeft: '22px' }}
                          value={(sales as any)[item.key]}
                          onChange={e => setSales({ ...sales, [item.key]: e.target.value })} />
                      </div>
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      {item.countKey
                        ? <input type="number" placeholder="0" style={{ ...inp, textAlign: 'center' as const }}
                            value={(sales as any)[item.countKey]}
                            onChange={e => setSales({ ...sales, [item.countKey!]: e.target.value })} />
                        : <span style={{ display: 'block', textAlign: 'center' as const, color: '#CBD5E1' }}>—</span>
                      }
                    </td>
                  </tr>
                ))}

                {/* Sales Tax row */}
                <tr style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '4px', height: '22px', borderRadius: '2px', background: '#D97706', flexShrink: 0 }}></div>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#0F172A' }}>Sales Tax</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{ fontSize: '12px', fontWeight: '700', color: '#D97706', background: '#FFFBEB', padding: '3px 8px', borderRadius: '5px', border: '1px solid #FDE68A' }}>{GL.SALES_TAX.code}</code>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>{GL.SALES_TAX.desc}</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '13px' }}>$</span>
                      <input type="number" placeholder="0.00" style={{ ...inp, paddingLeft: '22px', background: '#FFFBEB' }}
                        value={sales.sales_tax}
                        onChange={e => setSales({ ...sales, sales_tax: e.target.value })} />
                    </div>
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'center' as const, color: '#CBD5E1' }}>—</td>
                </tr>

                {/* Subtotal */}
                <tr style={{ background: '#F0F9FF', borderTop: '2px solid #BFDBFE' }}>
                  <td colSpan={2} style={{ padding: '13px 16px', fontSize: '14px', fontWeight: '700', color: '#1E40AF' }}>Subtotal — All Sales Items</td>
                  <td style={{ padding: '13px 16px', textAlign: 'right' as const, fontSize: '16px', fontWeight: '800', color: '#1E40AF' }}>${totalSales.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tenders tab ── */}
        {activeTab === 'tenders' && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Payment Type', 'iBirdOS GL Code', 'Amount'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#94A3B8', textAlign: i === 2 ? 'right' as const : 'left' as const, borderBottom: '1px solid #E2E8F0', textTransform: 'uppercase' as const, letterSpacing: '0.05em', width: i === 2 ? '180px' : 'auto' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TENDER_ITEMS.map((item, i) => (
                  <tr key={item.key} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                    <td style={{ padding: '11px 16px', fontSize: '14px', fontWeight: '500', color: '#0F172A' }}>{item.label}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ fontSize: '12px', fontWeight: '700', color: '#2563EB', background: '#EFF6FF', padding: '3px 8px', borderRadius: '5px' }}>{item.gl.code}</code>
                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>{item.gl.desc}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '13px' }}>$</span>
                        <input type="number" placeholder="0.00" style={{ ...inp, paddingLeft: '22px' }}
                          value={(tenders as any)[item.key]}
                          onChange={e => setTenders({ ...tenders, [item.key]: e.target.value })} />
                      </div>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#F0F9FF', borderTop: '2px solid #BFDBFE' }}>
                  <td colSpan={2} style={{ padding: '13px 16px', fontSize: '14px', fontWeight: '700', color: '#1E40AF' }}>Subtotal — All Tenders</td>
                  <td style={{ padding: '13px 16px', textAlign: 'right' as const, fontSize: '16px', fontWeight: '800', color: '#1E40AF' }}>${totalTenders.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── Sticky bottom bar ── */}
        <div style={{ position: 'sticky', bottom: 0, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 -4px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' as const }}>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Sales <strong style={{ color: '#0F172A', marginLeft: '4px' }}>${totalSales.toFixed(2)}</strong>
            </div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Tenders <strong style={{ color: '#0F172A', marginLeft: '4px' }}>${totalTenders.toFixed(2)}</strong>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: balanced ? '#059669' : '#DC2626', background: balanced ? '#F0FDF4' : '#FEF2F2', padding: '5px 14px', borderRadius: '6px' }}>
              {balanced ? 'Balanced $0.00' : `Over/Short $${Math.abs(variance).toFixed(2)}`}
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>
              Unit: <strong style={{ color: currentUnit.tierColor }}>{currentUnit.id}</strong> · {period} Wk{week}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setNoSaleDay(!noSaleDay)} style={{ padding: '9px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', background: noSaleDay ? '#FEF2F2' : '#F8FAFC', color: noSaleDay ? '#DC2626' : '#475569', border: noSaleDay ? '1px solid #FECACA' : '1px solid #E2E8F0', cursor: 'pointer' }}>
              {noSaleDay ? 'No Sale Day ON' : 'No Sale Day'}
            </button>
            <button style={{ padding: '9px 16px', borderRadius: '6px', fontSize: '13px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', cursor: 'pointer' }}>Save</button>
            <button onClick={handlePost} disabled={saving} style={{ padding: '9px 22px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', background: saved ? '#059669' : '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
              {saving ? 'Posting...' : saved ? 'Posted' : `Post — ${currentUnit.id}`}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}