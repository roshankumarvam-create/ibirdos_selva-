'use client'
import { useState, useRef } from 'react'

// ── iBirdOS Inventory Master — pulled from latest Sysco invoice prices ──
const INVENTORY_ITEMS = [
  { name: 'Chicken Thigh', category: 'Meat/Poultry', gl: 'IB-4111', unit: 'lbs', sysco_price: 3.29, last_invoice: '755148608', last_updated: 'Apr 16, 2026' },
  { name: 'Chicken Breast', category: 'Meat/Poultry', gl: 'IB-4111', unit: 'lbs', sysco_price: 4.12, last_invoice: '755148608', last_updated: 'Apr 16, 2026' },
  { name: 'Turkey Breast RST PET RTC', category: 'Meat/Poultry', gl: 'IB-4111', unit: 'lbs', sysco_price: 5.35, last_invoice: '755148608', last_updated: 'Apr 16, 2026' },
  { name: 'Beef Ground Bulk 80/20 HMBRGR', category: 'Meat/Poultry', gl: 'IB-4111', unit: 'CA', sysco_price: 110.65, last_invoice: '755148608', last_updated: 'Apr 16, 2026' },
  { name: 'Lamb Leg Bone-In', category: 'Meat/Poultry', gl: 'IB-4111', unit: 'lbs', sysco_price: 8.90, last_invoice: '755148607', last_updated: 'Apr 16, 2026' },
  { name: 'Base Chicken LSOD No MSG GF', category: 'Grocery/Storeroom', gl: 'IB-4112', unit: 'CA', sysco_price: 62.37, last_invoice: '755148608', last_updated: 'Apr 16, 2026' },
  { name: 'Sauce Demi Glace Concentrate', category: 'Grocery/Storeroom', gl: 'IB-4112', unit: 'EA', sysco_price: 39.61, last_invoice: '755148608', last_updated: 'Apr 16, 2026' },
  { name: 'Seasoning Cajun', category: 'Grocery/Storeroom', gl: 'IB-4112', unit: 'EA', sysco_price: 18.71, last_invoice: '755148608', last_updated: 'Apr 16, 2026' },
  { name: 'Chettinad Spice Mix', category: 'Grocery/Storeroom', gl: 'IB-4112', unit: 'lbs', sysco_price: 18.40, last_invoice: '755148607', last_updated: 'Apr 16, 2026' },
  { name: 'Gingelly Oil', category: 'Grocery/Storeroom', gl: 'IB-4112', unit: 'ltr', sysco_price: 12.40, last_invoice: '755148607', last_updated: 'Apr 16, 2026' },
  { name: 'Basmati Rice', category: 'Grocery/Storeroom', gl: 'IB-4112', unit: 'lbs', sysco_price: 1.24, last_invoice: '755148607', last_updated: 'Apr 16, 2026' },
  { name: 'Cream HVY WHP 40% PLAS', category: 'Dairy', gl: 'IB-4113', unit: 'CA', sysco_price: 40.92, last_invoice: '755148608', last_updated: 'Apr 16, 2026' },
  { name: 'Milk Homogenized', category: 'Dairy', gl: 'IB-4113', unit: 'CA', sysco_price: 10.91, last_invoice: '755148608', last_updated: 'Apr 16, 2026' },
  { name: 'Paneer Fresh', category: 'Dairy', gl: 'IB-4113', unit: 'lbs', sysco_price: 6.80, last_invoice: '755148607', last_updated: 'Apr 16, 2026' },
  { name: 'Tomatoes', category: 'Produce', gl: 'IB-4114', unit: 'lbs', sysco_price: 1.20, last_invoice: '755148607', last_updated: 'Apr 16, 2026' },
  { name: 'Onions Yellow', category: 'Produce', gl: 'IB-4114', unit: 'lbs', sysco_price: 0.68, last_invoice: '755148607', last_updated: 'Apr 16, 2026' },
  { name: 'Curry Leaves', category: 'Produce', gl: 'IB-4114', unit: 'lbs', sysco_price: 8.00, last_invoice: '755148607', last_updated: 'Apr 16, 2026' },
  { name: 'Coconut Milk', category: 'Grocery/Storeroom', gl: 'IB-4112', unit: 'cans', sysco_price: 3.80, last_invoice: '755148607', last_updated: 'Apr 16, 2026' },
  { name: 'Tofu Firm', category: 'Grocery/Storeroom', gl: 'IB-4112', unit: 'lbs', sysco_price: 2.40, last_invoice: '755148608', last_updated: 'Apr 16, 2026' },
  { name: 'Salmon Fillet', category: 'Seafood', gl: 'IB-4115', unit: 'lbs', sysco_price: 11.40, last_invoice: '755148606', last_updated: 'Apr 16, 2026' },
]

const RECIPE_LIBRARY = [
  { id:1, name:'Chettinad Chicken Curry', cuisine:'Tamil Nadu', category:'Protein', yield:132, yield_unit:'portions', cost_per_portion:3.42, selling_price:14.00, margin_pct:75.6, prep_time:90, allergens:['None'], dietary:['Halal'], gl:'IB-4111', status:'production', last_used:'Apr 18, 2026', times_used:47 },
  { id:2, name:'Kerala Sadya Sambar', cuisine:'Kerala', category:'Vegetarian', yield:100, yield_unit:'portions', cost_per_portion:1.84, selling_price:8.00, margin_pct:77.0, prep_time:60, allergens:['None'], dietary:['Vegan','Jain'], gl:'IB-4114', status:'production', last_used:'Apr 15, 2026', times_used:32 },
  { id:3, name:'Basmati Rice Event Scale', cuisine:'Universal', category:'Grain', yield:132, yield_unit:'portions', cost_per_portion:0.68, selling_price:3.00, margin_pct:77.3, prep_time:25, allergens:['None'], dietary:['Vegan','Halal','Jain'], gl:'IB-4112', status:'production', last_used:'Apr 18, 2026', times_used:89 },
  { id:4, name:'Paneer Tikka Masala', cuisine:'North Indian', category:'Vegetarian', yield:80, yield_unit:'portions', cost_per_portion:2.94, selling_price:13.00, margin_pct:77.4, prep_time:75, allergens:['Dairy'], dietary:['Vegetarian'], gl:'IB-4113', status:'production', last_used:'Apr 12, 2026', times_used:18 },
  { id:5, name:'Tofu Stir Fry Thai Style', cuisine:'Thai', category:'Vegan', yield:60, yield_unit:'portions', cost_per_portion:2.12, selling_price:11.00, margin_pct:80.7, prep_time:40, allergens:['Soy'], dietary:['Vegan'], gl:'IB-4112', status:'testing', last_used:'Apr 8, 2026', times_used:5 },
  { id:6, name:'Lamb Biryani Hyderabadi', cuisine:'Hyderabadi', category:'Protein', yield:80, yield_unit:'portions', cost_per_portion:6.20, selling_price:22.00, margin_pct:71.8, prep_time:180, allergens:['None'], dietary:['Halal'], gl:'IB-4111', status:'production', last_used:'Apr 5, 2026', times_used:12 },
]

interface Ingredient {
  id: number
  item_name: string
  category: string
  gl: string
  qty: string
  unit: string
  yield_pct: string
  sysco_price: number
  total_cost: number
  search: string
  suggestions: typeof INVENTORY_ITEMS
  showSuggestions: boolean
}

export default function RecipesPage() {
  const [view, setView] = useState<'library'|'detail'|'new'|'upload'>('library')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [activeFilter, setActiveFilter] = useState('All')
  const [uploadDone, setUploadDone] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newRecipeSaved, setNewRecipeSaved] = useState(false)
  const [newRecipeSaving, setNewRecipeSaving] = useState(false)
  const [recipes, setRecipes] = useState(RECIPE_LIBRARY)
  const fileRef = useRef<HTMLInputElement>(null)

  // New recipe form
  const [newRecipe, setNewRecipe] = useState({ name: '', cuisine: '', category: 'Protein', yield_qty: '', yield_unit: 'portions', prep_time: '', selling_price: '', dietary: [] as string[], allergens: [] as string[], steps: '' })
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 1, item_name: '', category: '', gl: '', qty: '', unit: 'lbs', yield_pct: '100', sysco_price: 0, total_cost: 0, search: '', suggestions: [], showSuggestions: false }
  ])

  const filters = ['All','Protein','Vegetarian','Vegan','Jain','Halal','Gluten Free']

  const filtered = recipes.filter(r => {
    const ms = r.name.toLowerCase().includes(search.toLowerCase()) || r.cuisine.toLowerCase().includes(search.toLowerCase())
    const mf = activeFilter === 'All' || r.category === activeFilter || r.dietary.includes(activeFilter)
    return ms && mf
  })

  const totalIngredientCost = ingredients.reduce((s, i) => s + (i.total_cost || 0), 0)
  const costPerPortion = newRecipe.yield_qty ? (totalIngredientCost / Number(newRecipe.yield_qty)).toFixed(2) : '—'
  const margin = newRecipe.selling_price && newRecipe.yield_qty ? (((Number(newRecipe.selling_price) - totalIngredientCost / Number(newRecipe.yield_qty)) / Number(newRecipe.selling_price)) * 100).toFixed(1) : '—'

  function updateIngredientSearch(id: number, value: string) {
    const suggestions = value.length > 1 ? INVENTORY_ITEMS.filter(i => i.name.toLowerCase().includes(value.toLowerCase())).slice(0, 6) : []
    setIngredients(ings => ings.map(i => i.id === id ? { ...i, search: value, item_name: value, suggestions, showSuggestions: suggestions.length > 0 } : i))
  }

  function selectInventoryItem(ingId: number, item: typeof INVENTORY_ITEMS[0]) {
    setIngredients(ings => ings.map(i => {
      if (i.id !== ingId) return i
      const qty = Number(i.qty) || 0
      const yieldFactor = Number(i.yield_pct) / 100 || 1
      const total = qty * item.sysco_price * yieldFactor
      return { ...i, item_name: item.name, search: item.name, category: item.category, gl: item.gl, unit: item.unit, sysco_price: item.sysco_price, total_cost: total, suggestions: [], showSuggestions: false }
    }))
  }

  function updateIngredientQty(id: number, qty: string) {
    setIngredients(ings => ings.map(i => {
      if (i.id !== id) return i
      const q = Number(qty) || 0
      const yf = Number(i.yield_pct) / 100 || 1
      return { ...i, qty, total_cost: q * i.sysco_price * yf }
    }))
  }

  function updateIngredientYield(id: number, yp: string) {
    setIngredients(ings => ings.map(i => {
      if (i.id !== id) return i
      const yf = Number(yp) / 100 || 1
      const q = Number(i.qty) || 0
      return { ...i, yield_pct: yp, total_cost: q * i.sysco_price * yf }
    }))
  }

  function addIngredient() {
    const newId = Math.max(...ingredients.map(i => i.id)) + 1
    setIngredients([...ingredients, { id: newId, item_name: '', category: '', gl: '', qty: '', unit: 'lbs', yield_pct: '100', sysco_price: 0, total_cost: 0, search: '', suggestions: [], showSuggestions: false }])
  }

  function removeIngredient(id: number) {
    setIngredients(ings => ings.filter(i => i.id !== id))
  }

  async function handleSaveRecipe() {
    setNewRecipeSaving(true)
    await new Promise(r => setTimeout(r, 900))
    const newR = {
      id: recipes.length + 1,
      name: newRecipe.name || 'New Recipe',
      cuisine: newRecipe.cuisine || 'Custom',
      category: newRecipe.category,
      yield: Number(newRecipe.yield_qty) || 0,
      yield_unit: newRecipe.yield_unit,
      cost_per_portion: Number(costPerPortion) || 0,
      selling_price: Number(newRecipe.selling_price) || 0,
      margin_pct: Number(margin) || 0,
      prep_time: Number(newRecipe.prep_time) || 0,
      allergens: ['None'],
      dietary: newRecipe.dietary,
      gl: ingredients[0]?.gl || 'IB-4112',
      status: 'testing',
      last_used: 'Today',
      times_used: 0,
    }
    setRecipes([...recipes, newR])
    setNewRecipeSaved(true)
    setNewRecipeSaving(false)
    setTimeout(() => { setNewRecipeSaved(false); setView('library') }, 2000)
  }

  async function handleUpload() {
    setUploading(true)
    await new Promise(r => setTimeout(r, 2200))
    setUploading(false)
    setUploadDone(true)
  }

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#FFFFFF', color: '#0F172A', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E3A5F 100%)', padding: '24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>Recipe Library</h1>
            <p style={{ fontSize: '13px', color: '#93C5FD', marginTop: '4px' }}>Sysco invoice prices auto-pulled · Yield calculated · GL-coded · Allergen-tagged</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[{ v: 'library', label: 'Library' }, { v: 'new', label: '+ New Recipe' }, { v: 'upload', label: 'Upload CSV/PDF' }].map(b => (
              <button key={b.v} onClick={() => setView(b.v as any)} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none', background: view === b.v ? '#2563EB' : 'rgba(255,255,255,0.12)', color: 'white' }}>{b.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginTop: '20px' }}>
          {[
            { label: 'Recipes in Library', value: recipes.length.toString(), sub: `${recipes.filter(r => r.status === 'production').length} in production` },
            { label: 'Avg Margin', value: `${(recipes.reduce((s,r) => s+r.margin_pct,0)/recipes.length).toFixed(1)}%`, sub: 'Target > 70%' },
            { label: 'Avg Cost/Portion', value: `$${(recipes.reduce((s,r) => s+r.cost_per_portion,0)/recipes.length).toFixed(2)}`, sub: 'From live invoice prices' },
            { label: 'Inventory Items', value: INVENTORY_ITEMS.length.toString(), sub: 'From Sysco invoices' },
          ].map(c => (
            <div key={c.label} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase' as const, marginBottom: '4px' }}>{c.label}</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF' }}>{c.value}</div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>

        {/* ── LIBRARY VIEW ── */}
        {view === 'library' && (
          <>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 20px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' as const }}>
              <input placeholder="Search recipes or cuisine..." style={{ ...inp, flex: 1, minWidth: '200px' }} value={search} onChange={e => setSearch(e.target.value)} />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                {filters.map(f => (
                  <button key={f} onClick={() => setActiveFilter(f)} style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', border: 'none', background: activeFilter === f ? '#2563EB' : '#F1F5F9', color: activeFilter === f ? 'white' : '#64748B' }}>{f}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
              {filtered.map(r => (
                <div key={r.id} onClick={() => { setSelected(r); setView('detail') }} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '18px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A' }}>{r.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{r.cuisine} · {r.yield} {r.yield_unit}</div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', background: r.status === 'production' ? '#F0FDF4' : '#FFFBEB', color: r.status === 'production' ? '#166534' : '#92400E' }}>{r.status}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    {[{ label: 'Cost/ptn', value: `$${r.cost_per_portion}` }, { label: 'Sell', value: `$${r.selling_price}` }, { label: 'Margin', value: `${r.margin_pct}%` }].map(m => (
                      <div key={m.label} style={{ background: '#F8FAFC', borderRadius: '6px', padding: '8px', textAlign: 'center' as const }}>
                        <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' as const, marginBottom: '2px' }}>{m.label}</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: m.label === 'Margin' ? '#059669' : '#0F172A' }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' as const }}>
                    <code style={{ fontSize: '10px', color: '#2563EB', background: '#EFF6FF', padding: '2px 6px', borderRadius: '3px' }}>{r.gl}</code>
                    {r.dietary.map(d => <span key={d} style={{ fontSize: '10px', color: '#7C3AED', background: '#F3F4F6', padding: '2px 6px', borderRadius: '3px' }}>{d}</span>)}
                    {r.allergens[0] !== 'None' && r.allergens.map(a => <span key={a} style={{ fontSize: '10px', color: '#DC2626', background: '#FEF2F2', padding: '2px 6px', borderRadius: '3px' }}>⚠ {a}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── DETAIL VIEW ── */}
        {view === 'detail' && selected && (
          <div>
            <button onClick={() => { setSelected(null); setView('library') }} style={{ marginBottom: '16px', padding: '7px 14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>← Back</button>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>{selected.name}</h2>
              <p style={{ fontSize: '13px', color: '#64748B' }}>{selected.cuisine} · {selected.yield} {selected.yield_unit} · {selected.prep_time} min prep</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', margin: '16px 0' }}>
                {[{ label: 'Cost/Portion', value: `$${selected.cost_per_portion}`, color: '#D97706' }, { label: 'Sell Price', value: `$${selected.selling_price}`, color: '#0F172A' }, { label: 'Margin', value: `${selected.margin_pct}%`, color: '#059669' }, { label: 'Used', value: `${selected.times_used}x`, color: '#2563EB' }].map(m => (
                  <div key={m.label} style={{ background: '#F8FAFC', borderRadius: '8px', padding: '14px', textAlign: 'center' as const }}>
                    <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase' as const, marginBottom: '4px' }}>{m.label}</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['Scale Recipe', 'Print Card', 'Shopping List', 'Log Yield', 'Edit Recipe'].map(btn => (
                  <button key={btn} style={{ padding: '8px 14px', background: btn === 'Scale Recipe' ? '#2563EB' : '#F8FAFC', color: btn === 'Scale Recipe' ? 'white' : '#475569', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '12px', fontWeight: btn === 'Scale Recipe' ? '600' : '400', cursor: 'pointer' }}>{btn}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── NEW RECIPE VIEW ── */}
        {view === 'new' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
            <div>
              {/* Recipe info */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A', marginBottom: '16px' }}>Recipe Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Recipe Name *</label>
                    <input type="text" placeholder="e.g. Chettinad Chicken Curry" style={inp} value={newRecipe.name} onChange={e => setNewRecipe({ ...newRecipe, name: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Cuisine Type</label>
                    <input type="text" placeholder="e.g. Tamil Nadu" style={inp} value={newRecipe.cuisine} onChange={e => setNewRecipe({ ...newRecipe, cuisine: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Category</label>
                    <select style={{ ...inp, cursor: 'pointer' }} value={newRecipe.category} onChange={e => setNewRecipe({ ...newRecipe, category: e.target.value })}>
                      {['Protein','Vegetarian','Vegan','Grain','Bread','Beverage','Dessert','Seafood'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Prep Time (minutes)</label>
                    <input type="number" placeholder="90" style={inp} value={newRecipe.prep_time} onChange={e => setNewRecipe({ ...newRecipe, prep_time: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Yield Quantity *</label>
                    <input type="number" placeholder="132" style={inp} value={newRecipe.yield_qty} onChange={e => setNewRecipe({ ...newRecipe, yield_qty: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Yield Unit</label>
                    <select style={{ ...inp, cursor: 'pointer' }} value={newRecipe.yield_unit} onChange={e => setNewRecipe({ ...newRecipe, yield_unit: e.target.value })}>
                      {['portions','servings','lbs','kg','liters','units'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Selling Price per Portion ($)</label>
                    <input type="number" placeholder="14.00" step="0.01" style={inp} value={newRecipe.selling_price} onChange={e => setNewRecipe({ ...newRecipe, selling_price: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', display: 'block', marginBottom: '5px' }}>Dietary Tags</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                      {['Halal','Vegetarian','Vegan','Jain','Gluten Free'].map(d => (
                        <button key={d} onClick={() => {
                          const next = newRecipe.dietary.includes(d) ? newRecipe.dietary.filter(x => x !== d) : [...newRecipe.dietary, d]
                          setNewRecipe({ ...newRecipe, dietary: next })
                        }} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', border: '1px solid #E2E8F0', background: newRecipe.dietary.includes(d) ? '#7C3AED' : '#F8FAFC', color: newRecipe.dietary.includes(d) ? 'white' : '#64748B' }}>{d}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A' }}>Ingredients — Auto-priced from Sysco Invoices</h3>
                  <div style={{ fontSize: '12px', color: '#059669', background: '#F0FDF4', padding: '4px 10px', borderRadius: '6px' }}>Prices from invoice #755148608 — Apr 16, 2026</div>
                </div>

                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.8fr 0.8fr 0.8fr 1fr 1fr 0.5fr', gap: '6px', padding: '8px 0', borderBottom: '1px solid #E2E8F0', marginBottom: '8px' }}>
                  {['Item (type to search)', 'Qty', 'Unit', 'Yield %', 'Sysco Price', 'Total Cost', ''].map(h => (
                    <div key={h} style={{ fontSize: '10px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' as const }}>{h}</div>
                  ))}
                </div>

                {ingredients.map((ing, idx) => (
                  <div key={ing.id} style={{ position: 'relative', marginBottom: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.8fr 0.8fr 0.8fr 1fr 1fr 0.5fr', gap: '6px', alignItems: 'center' }}>
                      {/* Ingredient search */}
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          placeholder="Type ingredient name..."
                          style={{ ...inp, borderColor: ing.sysco_price > 0 ? '#BBF7D0' : '#E2E8F0' }}
                          value={ing.search}
                          onChange={e => updateIngredientSearch(ing.id, e.target.value)}
                          onFocus={() => {
                            if (ing.search.length > 1) {
                              const suggestions = INVENTORY_ITEMS.filter(i => i.name.toLowerCase().includes(ing.search.toLowerCase())).slice(0, 6)
                              setIngredients(ings => ings.map(i => i.id === ing.id ? { ...i, suggestions, showSuggestions: suggestions.length > 0 } : i))
                            }
                          }}
                        />
                        {ing.showSuggestions && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                            {ing.suggestions.map(s => (
                              <div key={s.name} onClick={() => selectInventoryItem(ing.id, s)} style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid #F8FAFC' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#0F172A' }}>{s.name}</div>
                                    <div style={{ fontSize: '11px', color: '#64748B' }}>{s.category}</div>
                                  </div>
                                  <div style={{ textAlign: 'right' as const }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>${s.sysco_price}/{s.unit}</div>
                                    <code style={{ fontSize: '10px', color: '#2563EB' }}>{s.gl}</code>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <input type="number" placeholder="0" style={inp} value={ing.qty} onChange={e => updateIngredientQty(ing.id, e.target.value)} />

                      <select style={{ ...inp, cursor: 'pointer' }} value={ing.unit} onChange={e => setIngredients(ings => ings.map(i => i.id === ing.id ? { ...i, unit: e.target.value } : i))}>
                        {['lbs','oz','kg','EA','CA','cans','ltr','cups','tbsp','tsp'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>

                      <div style={{ position: 'relative' }}>
                        <input type="number" placeholder="100" style={inp} value={ing.yield_pct} onChange={e => updateIngredientYield(ing.id, e.target.value)} />
                        <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#94A3B8' }}>%</span>
                      </div>

                      <div style={{ padding: '8px 10px', background: ing.sysco_price > 0 ? '#F0FDF4' : '#F8FAFC', border: `1px solid ${ing.sysco_price > 0 ? '#BBF7D0' : '#E2E8F0'}`, borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: ing.sysco_price > 0 ? '#059669' : '#94A3B8' }}>
                        {ing.sysco_price > 0 ? `$${ing.sysco_price}/${ing.unit}` : '—'}
                      </div>

                      <div style={{ padding: '8px 10px', background: ing.total_cost > 0 ? '#EFF6FF' : '#F8FAFC', border: `1px solid ${ing.total_cost > 0 ? '#BFDBFE' : '#E2E8F0'}`, borderRadius: '6px', fontSize: '14px', fontWeight: '700', color: ing.total_cost > 0 ? '#1E40AF' : '#94A3B8' }}>
                        {ing.total_cost > 0 ? `$${ing.total_cost.toFixed(2)}` : '—'}
                      </div>

                      <button onClick={() => removeIngredient(ing.id)} style={{ padding: '7px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '5px', color: '#DC2626', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>×</button>
                    </div>

                    {/* GL badge when item selected */}
                    {ing.gl && (
                      <div style={{ marginTop: '3px', display: 'flex', gap: '6px' }}>
                        <code style={{ fontSize: '10px', color: '#2563EB', background: '#EFF6FF', padding: '1px 6px', borderRadius: '3px' }}>{ing.gl}</code>
                        <span style={{ fontSize: '10px', color: '#64748B' }}>{ing.category}</span>
                        {ing.yield_pct !== '100' && <span style={{ fontSize: '10px', color: '#D97706' }}>Yield adjusted to {ing.yield_pct}%</span>}
                      </div>
                    )}
                  </div>
                ))}

                <button onClick={addIngredient} style={{ marginTop: '10px', padding: '8px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>+ Add Ingredient</button>

                {/* Totals */}
                {totalIngredientCost > 0 && (
                  <div style={{ marginTop: '14px', padding: '14px', background: '#F0F9FF', border: '1px solid #BFDBFE', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                    {[
                      { label: 'Total Recipe Cost', value: `$${totalIngredientCost.toFixed(2)}`, color: '#1E40AF' },
                      { label: 'Yield', value: newRecipe.yield_qty ? `${newRecipe.yield_qty} ${newRecipe.yield_unit}` : '—', color: '#0F172A' },
                      { label: 'Cost per Portion', value: `$${costPerPortion}`, color: '#D97706' },
                      { label: 'Margin', value: margin !== '—' ? `${margin}%` : '—', color: Number(margin) > 70 ? '#059669' : '#DC2626' },
                    ].map(m => (
                      <div key={m.label} style={{ textAlign: 'center' as const }}>
                        <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase' as const, marginBottom: '3px' }}>{m.label}</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: m.color }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Prep steps */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', marginBottom: '10px' }}>Preparation Steps</h3>
                <textarea placeholder="Enter step-by-step instructions..." style={{ ...inp, height: '100px', resize: 'vertical' as const }} value={newRecipe.steps} onChange={e => setNewRecipe({ ...newRecipe, steps: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSaveRecipe} disabled={newRecipeSaving} style={{ flex: 1, padding: '12px', background: newRecipeSaved ? '#059669' : '#2563EB', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                  {newRecipeSaving ? 'Saving to Library...' : newRecipeSaved ? '✓ Recipe Saved!' : 'Save Recipe to Library'}
                </button>
                <button onClick={() => setView('library')} style={{ padding: '12px 20px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>

            {/* Right — inventory reference */}
            <div>
              <div style={{ background: '#0A0F1E', border: '1px solid #1E2A45', borderRadius: '10px', padding: '16px', position: 'sticky', top: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#93C5FD', marginBottom: '10px', textTransform: 'uppercase' as const }}>Live Sysco Prices</div>
                <div style={{ fontSize: '11px', color: '#334155', marginBottom: '12px' }}>Invoice #755148608 — Apr 16, 2026</div>
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {['Meat/Poultry','Grocery/Storeroom','Dairy','Produce','Seafood'].map(cat => (
                    <div key={cat} style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' as const, marginBottom: '5px' }}>{cat}</div>
                      {INVENTORY_ITEMS.filter(i => i.category === cat).map(item => (
                        <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #1E2A45' }}>
                          <div>
                            <div style={{ fontSize: '12px', color: '#E2E8F0' }}>{item.name}</div>
                            <code style={{ fontSize: '10px', color: '#2563EB' }}>{item.gl}</code>
                          </div>
                          <div style={{ textAlign: 'right' as const }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#86EFAC' }}>${item.sysco_price}</div>
                            <div style={{ fontSize: '10px', color: '#475569' }}>/{item.unit}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── UPLOAD VIEW ── */}
        {view === 'upload' && (
          <div style={{ maxWidth: '700px' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '28px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0F172A', marginBottom: '6px' }}>Upload Recipe List — CSV or PDF</h3>
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>Upload a CSV or PDF with your recipe items. System maps to iBirdOS GL codes, inventory categories, and Sysco prices automatically.</p>

              <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #CBD5E1', borderRadius: '10px', padding: '40px', textAlign: 'center' as const, cursor: 'pointer', background: '#F8FAFC', marginBottom: '20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📄</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Click to upload or drag & drop</div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Supports: .csv, .xlsx, .pdf</div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.pdf" style={{ display: 'none' }} onChange={() => handleUpload()} />
              </div>

              {uploading && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1E40AF', marginBottom: '6px' }}>Processing upload...</div>
                  <div style={{ height: '6px', background: '#BFDBFE', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '70%', background: '#2563EB', borderRadius: '3px', animation: 'pulse 1s ease infinite' }}></div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#2563EB', marginTop: '6px' }}>Matching ingredients to iBirdOS inventory · Mapping GL codes · Calculating costs...</div>
                </div>
              )}

              {uploadDone && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>✓ Upload successful — 12 recipes imported</div>
                  <div style={{ fontSize: '12px', color: '#166534' }}>8 ingredients matched to Sysco inventory · 4 manual price entries needed</div>
                </div>
              )}

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', marginBottom: '10px' }}>Expected CSV Format</div>
                <code style={{ fontSize: '12px', color: '#2563EB', display: 'block', background: '#EFF6FF', padding: '12px', borderRadius: '6px', lineHeight: '1.8' }}>
                  recipe_name, cuisine, category, yield_qty, yield_unit, sell_price, prep_time<br/>
                  ingredient_name, quantity, unit, yield_pct<br/>
                  ingredient_name, quantity, unit, yield_pct<br/>
                  ---<br/>
                  recipe_name, cuisine, ...
                </code>
              </div>
            </div>

            {/* Sample CSV download */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', marginBottom: '10px' }}>Download Template</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{ padding: '10px 18px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Download CSV Template</button>
                <button style={{ padding: '10px 18px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Download Sample with Cafe 71 Data</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}