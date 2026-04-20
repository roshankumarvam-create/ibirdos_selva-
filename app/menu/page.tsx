'use client'
import { useState } from 'react'

const INITIAL_MENUS = [
  { id:1, name:'Cafe 71 April Menu 2026',   type:'Retail Seasonal', status:'In Production', period:'Apr 2026',  location:'RS-10001', lastModified:'Apr 15, 2026' },
  { id:2, name:'San Mar Cafe 5 Wk Cycle',   type:'Retail Core',     status:'In Production', period:'Ongoing',   location:'RS-10001', lastModified:'Mar 20, 2026' },
  { id:3, name:'Catering — Corporate',      type:'Catering',        status:'In Production', period:'Q2 2026',   location:'RS-10001', lastModified:'Apr 10, 2026' },
  { id:4, name:'Diwali Special 2026',       type:'Retail Seasonal', status:'Draft',         period:'Oct 2026',  location:'RS-10001', lastModified:'Apr 1, 2026' },
]

const INITIAL_ITEMS: Record<number, any[]> = {
  1: [
    { id:1, name:'Chettinad Chicken Curry', category:'Protein Main',    price:14.00, cost:3.42, allergens:'None',          dietary:'Halal',        status:'active', gl:'IB-3102' },
    { id:2, name:'Kerala Sadya Sambar',     category:'Vegetarian Main', price:8.00,  cost:1.84, allergens:'None',          dietary:'Vegan, Jain',  status:'active', gl:'IB-3102' },
    { id:3, name:'Basmati Rice',            category:'Side',            price:3.00,  cost:0.68, allergens:'None',          dietary:'Vegan, Halal', status:'active', gl:'IB-3101' },
    { id:4, name:'Raita',                   category:'Side',            price:2.50,  cost:0.72, allergens:'Dairy',         dietary:'Vegetarian',   status:'active', gl:'IB-3101' },
    { id:5, name:'Naan Bread',              category:'Bread',           price:2.00,  cost:0.48, allergens:'Gluten, Dairy', dietary:'Vegetarian',   status:'active', gl:'IB-3101' },
    { id:6, name:'Filter Coffee',           category:'Beverage',        price:3.50,  cost:0.42, allergens:'Dairy',         dietary:'Vegetarian',   status:'active', gl:'IB-3103' },
  ],
  2: [
    { id:1, name:'Grilled Chicken Bowl',   category:'Protein Main', price:13.00, cost:3.80, allergens:'None', dietary:'Halal', status:'active', gl:'IB-3101' },
    { id:2, name:'Veggie Wrap',            category:'Vegetarian',   price:9.50,  cost:2.10, allergens:'Gluten', dietary:'Vegetarian', status:'active', gl:'IB-3101' },
  ],
  3: [
    { id:1, name:'Catering Platter — Chicken', category:'Protein Main', price:280.00, cost:84.00, allergens:'None', dietary:'Halal', status:'active', gl:'IB-3104' },
  ],
  4: [],
}

export default function MenuPage() {
  const [menus, setMenus] = useState(INITIAL_MENUS)
  const [menuItems, setMenuItems] = useState(INITIAL_ITEMS)
  const [activeMenu, setActiveMenu] = useState<any>(null)
  const [showNewMenuModal, setShowNewMenuModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [newMenu, setNewMenu] = useState({ name:'', type:'Retail Seasonal', period:'', location:'RS-10001' })
  const [newItem, setNewItem] = useState({ name:'', category:'Protein Main', price:'', cost:'', allergens:'None', dietary:'', gl:'IB-3102', status:'active' })

  const currentItems = activeMenu ? (menuItems[activeMenu.id] || []) : []
  const marginPct = newItem.price && newItem.cost ? (((Number(newItem.price) - Number(newItem.cost)) / Number(newItem.price)) * 100).toFixed(1) : null

  async function handleCreateMenu() {
    if (!newMenu.name.trim()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    const id = Math.max(...menus.map(m => m.id)) + 1
    const created = { id, name: newMenu.name, type: newMenu.type, status: 'Draft', period: newMenu.period || 'TBD', location: newMenu.location, lastModified: 'Today' }
    setMenus([...menus, created])
    setMenuItems({ ...menuItems, [id]: [] })
    setActiveMenu(created)
    setShowNewMenuModal(false)
    setNewMenu({ name:'', type:'Retail Seasonal', period:'', location:'RS-10001' })
    setSaving(false)
  }

  async function handleAddItem() {
    if (!newItem.name.trim() || !activeMenu) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))

    const existing = menuItems[activeMenu.id] || []
    const newId = existing.length > 0 ? Math.max(...existing.map((i: any) => i.id)) + 1 : 1
    const addedItem = {
      id: newId,
      name: newItem.name,
      category: newItem.category,
      price: Number(newItem.price) || 0,
      cost: Number(newItem.cost) || 0,
      allergens: newItem.allergens,
      dietary: newItem.dietary,
      gl: newItem.gl,
      status: 'active',
    }

    const updatedItems = { ...menuItems, [activeMenu.id]: [...existing, addedItem] }
    setMenuItems(updatedItems)

    // Update menu item count
    setMenus(menus.map(m => m.id === activeMenu.id ? { ...m, lastModified: 'Just now' } : m))
    setActiveMenu({ ...activeMenu, lastModified: 'Just now' })

    setSaved(true)
    setSaving(false)
    setNewItem({ name:'', category:'Protein Main', price:'', cost:'', allergens:'None', dietary:'', gl:'IB-3102', status:'active' })
    setTimeout(() => { setSaved(false); setShowAddItemModal(false) }, 1200)
  }

  async function handleEditItem() {
    if (!editingItem || !activeMenu) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    const updatedItems = { ...menuItems, [activeMenu.id]: (menuItems[activeMenu.id]||[]).map((i: any) => i.id === editingItem.id ? editingItem : i) }
    setMenuItems(updatedItems)
    setSaving(false)
    setShowEditModal(false)
    setEditingItem(null)
  }

  function deleteItem(itemId: number) {
    if (!activeMenu) return
    const updatedItems = { ...menuItems, [activeMenu.id]: (menuItems[activeMenu.id]||[]).filter((i: any) => i.id !== itemId) }
    setMenuItems(updatedItems)
  }

  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #E2E8F0', borderRadius:'6px', fontSize:'13px', outline:'none', background:'#FFFFFF', color:'#0F172A', boxSizing:'border-box' as const }

  return (
    <div style={{ minHeight:'100vh', background:'#F1F5F9' }}>

      {/* CREATE MENU MODAL */}
      {showNewMenuModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#FFFFFF', borderRadius:'12px', padding:'28px', width:'480px', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize:'17px', fontWeight:'700', color:'#0F172A', marginBottom:'4px' }}>Create New Menu</h3>
            <p style={{ fontSize:'13px', color:'#64748B', marginBottom:'20px' }}>Set up a new menu. Add items after creating.</p>
            <div style={{ display:'grid', gap:'14px' }}>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', display:'block', marginBottom:'5px' }}>Menu Name *</label>
                <input type="text" placeholder="e.g. Cafe 71 Summer Menu 2026" style={inp} value={newMenu.name} onChange={e => setNewMenu({...newMenu, name:e.target.value})} autoFocus />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', display:'block', marginBottom:'5px' }}>Menu Type</label>
                  <select style={{ ...inp, cursor:'pointer' }} value={newMenu.type} onChange={e => setNewMenu({...newMenu, type:e.target.value})}>
                    {['Retail Seasonal','Retail Core','Catering','Event Special','Test Menu'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', display:'block', marginBottom:'5px' }}>Period</label>
                  <input type="text" placeholder="e.g. May-Jun 2026" style={inp} value={newMenu.period} onChange={e => setNewMenu({...newMenu, period:e.target.value})} />
                </div>
              </div>
              <div style={{ padding:'10px 12px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'6px', fontSize:'13px', color:'#166534', fontWeight:'500' }}>
                Unit: RS-10001 · Cafe 71 Redmond (your unit)
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
              <button onClick={handleCreateMenu} disabled={saving || !newMenu.name.trim()} style={{ flex:1, padding:'11px', background: !newMenu.name.trim() ? '#E2E8F0' : '#2563EB', color: !newMenu.name.trim() ? '#94A3B8' : 'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
                {saving ? 'Creating...' : 'Create Menu'}
              </button>
              <button onClick={() => setShowNewMenuModal(false)} style={{ padding:'11px 18px', background:'#F8FAFC', color:'#475569', border:'1px solid #E2E8F0', borderRadius:'8px', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ITEM MODAL */}
      {showAddItemModal && activeMenu && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#FFFFFF', borderRadius:'12px', padding:'28px', width:'540px', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize:'17px', fontWeight:'700', color:'#0F172A', marginBottom:'4px' }}>Add Menu Item</h3>
            <p style={{ fontSize:'13px', color:'#64748B', marginBottom:'20px' }}>
              Adding to: <strong>{activeMenu.name}</strong> · {currentItems.length} items currently
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', display:'block', marginBottom:'5px' }}>Item Name *</label>
                <input type="text" placeholder="e.g. Chicken Tikka, Sambar, Filter Coffee..." style={inp} value={newItem.name} onChange={e => setNewItem({...newItem, name:e.target.value})} autoFocus />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', display:'block', marginBottom:'5px' }}>Category</label>
                <select style={{ ...inp, cursor:'pointer' }} value={newItem.category} onChange={e => setNewItem({...newItem, category:e.target.value})}>
                  {['Protein Main','Vegetarian Main','Vegan','Side','Bread','Beverage','Dessert','Snack','Catering Platter','Soup'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', display:'block', marginBottom:'5px' }}>GL Code</label>
                <select style={{ ...inp, cursor:'pointer' }} value={newItem.gl} onChange={e => setNewItem({...newItem, gl:e.target.value})}>
                  {[
                    { code:'IB-3100', desc:'Breakfast Sales' },
                    { code:'IB-3101', desc:'Lunch Sales' },
                    { code:'IB-3102', desc:'Dinner Sales' },
                    { code:'IB-3103', desc:'Beverage' },
                    { code:'IB-3104', desc:'Catering' },
                    { code:'IB-3105', desc:'Retail' },
                  ].map(g => <option key={g.code} value={g.code}>{g.code} — {g.desc}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', display:'block', marginBottom:'5px' }}>Selling Price ($) *</label>
                <input type="number" placeholder="14.00" step="0.01" style={inp} value={newItem.price} onChange={e => setNewItem({...newItem, price:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', display:'block', marginBottom:'5px' }}>Food Cost ($)</label>
                <input type="number" placeholder="3.42" step="0.01" style={inp} value={newItem.cost} onChange={e => setNewItem({...newItem, cost:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', display:'block', marginBottom:'5px' }}>Allergens</label>
                <input type="text" placeholder="None, Dairy, Gluten, Nuts..." style={inp} value={newItem.allergens} onChange={e => setNewItem({...newItem, allergens:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', display:'block', marginBottom:'5px' }}>Dietary Tags</label>
                <input type="text" placeholder="Halal, Vegan, Jain, Vegetarian..." style={inp} value={newItem.dietary} onChange={e => setNewItem({...newItem, dietary:e.target.value})} />
              </div>

              {/* Live margin calc */}
              {marginPct && (
                <div style={{ gridColumn:'1 / -1', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'8px', padding:'12px 14px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', textAlign:'center' as const }}>
                  <div>
                    <div style={{ fontSize:'10px', color:'#64748B', textTransform:'uppercase' as const, marginBottom:'2px' }}>Sell Price</div>
                    <div style={{ fontSize:'16px', fontWeight:'700', color:'#0F172A' }}>${Number(newItem.price).toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:'10px', color:'#64748B', textTransform:'uppercase' as const, marginBottom:'2px' }}>Food Cost</div>
                    <div style={{ fontSize:'16px', fontWeight:'700', color:'#D97706' }}>${Number(newItem.cost).toFixed(2)} ({((Number(newItem.cost)/Number(newItem.price))*100).toFixed(1)}%)</div>
                  </div>
                  <div>
                    <div style={{ fontSize:'10px', color:'#64748B', textTransform:'uppercase' as const, marginBottom:'2px' }}>Margin</div>
                    <div style={{ fontSize:'16px', fontWeight:'700', color: Number(marginPct) > 65 ? '#059669' : '#DC2626' }}>{marginPct}%</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
              <button onClick={handleAddItem} disabled={saving || !newItem.name.trim()} style={{ flex:1, padding:'12px', background: saved ? '#059669' : !newItem.name.trim() ? '#E2E8F0' : '#2563EB', color: !newItem.name.trim() ? '#94A3B8' : 'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
                {saving ? 'Adding...' : saved ? '✓ Item Added!' : 'Add to Menu'}
              </button>
              <button onClick={() => { setShowAddItemModal(false); setNewItem({ name:'', category:'Protein Main', price:'', cost:'', allergens:'None', dietary:'', gl:'IB-3102', status:'active' }) }} style={{ padding:'12px 18px', background:'#F8FAFC', color:'#475569', border:'1px solid #E2E8F0', borderRadius:'8px', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ITEM MODAL */}
      {showEditModal && editingItem && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#FFFFFF', borderRadius:'12px', padding:'28px', width:'480px', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize:'16px', fontWeight:'700', color:'#0F172A', marginBottom:'16px' }}>Edit Menu Item</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={{ fontSize:'12px', fontWeight:'500', color:'#374151', display:'block', marginBottom:'5px' }}>Item Name</label>
                <input type="text" style={inp} value={editingItem.name} onChange={e => setEditingItem({...editingItem, name:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'500', color:'#374151', display:'block', marginBottom:'5px' }}>Price ($)</label>
                <input type="number" style={inp} value={editingItem.price} onChange={e => setEditingItem({...editingItem, price:Number(e.target.value)})} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'500', color:'#374151', display:'block', marginBottom:'5px' }}>Cost ($)</label>
                <input type="number" style={inp} value={editingItem.cost} onChange={e => setEditingItem({...editingItem, cost:Number(e.target.value)})} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'500', color:'#374151', display:'block', marginBottom:'5px' }}>Allergens</label>
                <input type="text" style={inp} value={editingItem.allergens} onChange={e => setEditingItem({...editingItem, allergens:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'500', color:'#374151', display:'block', marginBottom:'5px' }}>Status</label>
                <select style={{ ...inp, cursor:'pointer' }} value={editingItem.status} onChange={e => setEditingItem({...editingItem, status:e.target.value})}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="seasonal">Seasonal</option>
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={handleEditItem} style={{ flex:1, padding:'11px', background:'#2563EB', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>{saving ? 'Saving...' : 'Save Changes'}</button>
              <button onClick={() => { setShowEditModal(false); setEditingItem(null) }} style={{ padding:'11px 16px', background:'#F8FAFC', color:'#475569', border:'1px solid #E2E8F0', borderRadius:'8px', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0F172A 0%,#1E3A5F 100%)', padding:'24px 32px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:'700', color:'#FFFFFF', margin:0 }}>Menu Works</h1>
            <p style={{ fontSize:'13px', color:'#93C5FD', marginTop:'4px' }}>Webtrition-compatible · FDA allergen labeled · Cost-indexed · Production-ready</p>
          </div>
          <button onClick={() => setShowNewMenuModal(true)} style={{ padding:'10px 20px', background:'#2563EB', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
            + Create New Menu
          </button>
        </div>
      </div>

      <div style={{ padding:'24px 32px', display:'grid', gridTemplateColumns:'300px 1fr', gap:'20px' }}>

        {/* Menu list */}
        <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:'10px', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:'13px', fontWeight:'600', color:'#0F172A' }}>Select a Menu</span>
            <span style={{ fontSize:'11px', color:'#94A3B8' }}>{menus.length} menus</span>
          </div>
          <div style={{ padding:'8px' }}>
            {['In Production','Draft'].map(statusGroup => {
              const groupMenus = menus.filter(m => statusGroup === 'In Production' ? m.status === 'In Production' : m.status !== 'In Production')
              if (groupMenus.length === 0) return null
              return (
                <div key={statusGroup}>
                  <div style={{ fontSize:'11px', fontWeight:'600', color:'#94A3B8', padding:'8px 8px 4px', textTransform:'uppercase' as const }}>{statusGroup} ({groupMenus.length})</div>
                  {groupMenus.map(m => (
                    <div key={m.id} onClick={() => setActiveMenu(m)} style={{ padding:'10px 12px', borderRadius:'6px', cursor:'pointer', background: activeMenu?.id === m.id ? '#EFF6FF' : 'transparent', border: activeMenu?.id === m.id ? '1px solid #BFDBFE' : '1px solid transparent', marginBottom:'2px' }}>
                      <div style={{ fontSize:'13px', fontWeight:'500', color:'#0F172A' }}>{m.name}</div>
                      <div style={{ fontSize:'11px', color:'#64748B', marginTop:'2px' }}>
                        {m.type} · {(menuItems[m.id]||[]).length} items · {m.period}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* Menu detail */}
        <div>
          {!activeMenu ? (
            <div style={{ background:'#FFFFFF', border:'2px dashed #E2E8F0', borderRadius:'10px', padding:'60px', textAlign:'center' as const }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>📜</div>
              <div style={{ fontSize:'15px', fontWeight:'600', color:'#64748B', marginBottom:'8px' }}>Select a menu to view and edit its items</div>
              <button onClick={() => setShowNewMenuModal(true)} style={{ marginTop:'8px', padding:'10px 20px', background:'#2563EB', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>+ Create New Menu</button>
            </div>
          ) : (
            <>
              {/* Menu header */}
              <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:'10px', padding:'20px', marginBottom:'14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize:'18px', fontWeight:'700', color:'#0F172A', marginBottom:'6px' }}>{activeMenu.name}</h2>
                    <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' as const }}>
                      <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'4px', background: activeMenu.status==='In Production'?'#F0FDF4':'#FFFBEB', color: activeMenu.status==='In Production'?'#166534':'#92400E', fontWeight:'600' }}>{activeMenu.status}</span>
                      <span style={{ fontSize:'12px', color:'#64748B' }}>{activeMenu.type} · {activeMenu.period}</span>
                      <code style={{ fontSize:'11px', color:'#2563EB', background:'#EFF6FF', padding:'2px 6px', borderRadius:'3px' }}>{activeMenu.location}</code>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button onClick={() => { setShowAddItemModal(true); setSaved(false) }} style={{ padding:'9px 18px', background:'#2563EB', color:'white', border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
                      + Add Item
                    </button>
                    <button style={{ padding:'9px 14px', background:'#F8FAFC', color:'#475569', border:'1px solid #E2E8F0', borderRadius:'7px', fontSize:'12px', cursor:'pointer' }}>Export PDF</button>
                    {activeMenu.status !== 'In Production' && (
                      <button onClick={() => { const updated = {...activeMenu, status:'In Production'}; setMenus(menus.map(m => m.id===activeMenu.id ? updated : m)); setActiveMenu(updated) }} style={{ padding:'9px 14px', background:'#059669', color:'white', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>Go Live</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Items table */}
              <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:'10px', overflow:'hidden', marginBottom:'14px' }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <h3 style={{ fontSize:'14px', fontWeight:'600', color:'#0F172A' }}>
                    Menu Items — {currentItems.length} items
                  </h3>
                  <span style={{ fontSize:'12px', color:'#64748B' }}>Modified: {activeMenu.lastModified}</span>
                </div>

                {currentItems.length === 0 ? (
                  <div style={{ padding:'40px', textAlign:'center' as const }}>
                    <div style={{ fontSize:'28px', marginBottom:'8px' }}>🍽️</div>
                    <div style={{ fontSize:'14px', color:'#64748B', marginBottom:'12px' }}>No items yet. Add your first menu item.</div>
                    <button onClick={() => { setShowAddItemModal(true); setSaved(false) }} style={{ padding:'9px 18px', background:'#2563EB', color:'white', border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>+ Add First Item</button>
                  </div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ background:'#F8FAFC' }}>
                        {['Item','Category','GL','Price','Cost','Margin','Allergens','Dietary','Status','Actions'].map(h => (
                          <th key={h} style={{ padding:'9px 12px', fontSize:'11px', fontWeight:'600', color:'#94A3B8', textAlign:'left' as const, borderBottom:'1px solid #E2E8F0', textTransform:'uppercase' as const }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((item: any) => {
                        const margin = item.price && item.cost ? (((item.price - item.cost) / item.price) * 100).toFixed(1) : '—'
                        return (
                          <tr key={item.id} style={{ borderBottom:'1px solid #F1F5F9' }}>
                            <td style={{ padding:'10px 12px', fontSize:'13px', fontWeight:'500', color:'#0F172A' }}>{item.name}</td>
                            <td style={{ padding:'10px 12px', fontSize:'12px', color:'#64748B' }}>{item.category}</td>
                            <td style={{ padding:'10px 12px' }}><code style={{ fontSize:'11px', color:'#2563EB', background:'#EFF6FF', padding:'2px 5px', borderRadius:'3px' }}>{item.gl}</code></td>
                            <td style={{ padding:'10px 12px', fontSize:'13px', fontWeight:'600', color:'#0F172A' }}>${Number(item.price).toFixed(2)}</td>
                            <td style={{ padding:'10px 12px', fontSize:'13px', color:'#475569' }}>${Number(item.cost).toFixed(2)}</td>
                            <td style={{ padding:'10px 12px' }}><span style={{ fontSize:'12px', fontWeight:'700', color: Number(margin) > 65 ? '#059669' : '#DC2626' }}>{margin}%</span></td>
                            <td style={{ padding:'10px 12px', fontSize:'12px', color: item.allergens !== 'None' ? '#DC2626' : '#94A3B8' }}>{item.allergens}</td>
                            <td style={{ padding:'10px 12px', fontSize:'11px', color:'#7C3AED' }}>{item.dietary}</td>
                            <td style={{ padding:'10px 12px' }}><span style={{ fontSize:'11px', background:'#F0FDF4', color:'#166534', padding:'2px 7px', borderRadius:'4px', fontWeight:'600' }}>{item.status}</span></td>
                            <td style={{ padding:'10px 12px' }}>
                              <div style={{ display:'flex', gap:'5px' }}>
                                <button onClick={() => { setEditingItem({...item}); setShowEditModal(true) }} style={{ padding:'4px 9px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:'4px', fontSize:'11px', color:'#2563EB', cursor:'pointer', fontWeight:'600' }}>Edit</button>
                                <button onClick={() => deleteItem(item.id)} style={{ padding:'4px 9px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'4px', fontSize:'11px', color:'#DC2626', cursor:'pointer' }}>✕</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* AI */}
              <div style={{ background:'rgba(37,99,235,0.06)', border:'1px solid rgba(37,99,235,0.2)', borderRadius:'10px', padding:'16px' }}>
                <div style={{ fontSize:'13px', fontWeight:'600', color:'#1E40AF', marginBottom:'6px' }}>🤖 Clow AI Menu Analysis</div>
                <div style={{ fontSize:'13px', color:'#1E40AF', lineHeight:'1.5' }}>
                  {currentItems.length === 0
                    ? 'No items yet. Add items to get AI analysis on margins, allergens, and FDA compliance.'
                    : `${currentItems.length} items added. ${currentItems.filter((i:any)=>i.allergens!=='None').length > 0 ? `${currentItems.filter((i:any)=>i.allergens!=='None').length} item(s) have allergens — ensure FDA front-of-menu labeling. ` : ''}${currentItems.length > 0 ? `Avg margin: ${(currentItems.reduce((s:any,i:any)=>s+(((i.price-i.cost)/i.price)*100),0)/currentItems.length).toFixed(1)}%. Target > 65%.` : ''}`
                  }
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}