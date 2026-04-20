'use client'
import { useState, useEffect } from 'react'

const TEAM_MEMBERS = [
  { id: 'u003', name: 'Chef Rajan', role: 'CHEF', initials: 'CR', color: '#DC2626' },
  { id: 'u004', name: 'Ana Gomez', role: 'STAFF', initials: 'AG', color: '#2563EB' },
  { id: 'u005', name: 'Mike Torres', role: 'STAFF', initials: 'MT', color: '#059669' },
  { id: 'u006', name: 'Priya Kumar', role: 'MANAGER', initials: 'PK', color: '#7C3AED' },
]

const INITIAL_TASKS = [
  { id:1,  station:'ALL',   time:'5:45 AM',  task:'Equipment check + temp log', done:false, critical:true,  assigned:'u006', note:'' },
  { id:2,  station:'GRILL', time:'6:00 AM',  task:'Temper 56 lb chicken — weigh + photo scale', done:false, critical:true,  assigned:'u003', note:'' },
  { id:3,  station:'PREP',  time:'6:15 AM',  task:'Screenshot Sysco invoice — check chicken price', done:true,  critical:true,  assigned:'u003', note:'Price confirmed $3.29/lb' },
  { id:4,  station:'PREP',  time:'6:30 AM',  task:'Dry roast Chettinad spice mix', done:true,  critical:false, assigned:'u004', note:'' },
  { id:5,  station:'GRILL', time:'6:35 AM',  task:'Start dual protein production — chicken + tofu', done:true,  critical:true,  assigned:'u003', note:'' },
  { id:6,  station:'RICE',  time:'7:00 AM',  task:'Start basmati rice — 45 lb batch', done:false, critical:false, assigned:'u004', note:'' },
  { id:7,  station:'PREP',  time:'7:30 AM',  task:'Prepare veg boxes — 12 boxes target', done:false, critical:false, assigned:'u005', note:'' },
  { id:8,  station:'HACCP', time:'8:00 AM',  task:'Temp check — all proteins must be 165°F internal', done:false, critical:true,  assigned:'u003', note:'' },
  { id:9,  station:'GRILL', time:'9:30 AM',  task:'Log yield — weigh final product + photo', done:false, critical:true,  assigned:'u003', note:'' },
  { id:10, station:'PACK',  time:'9:45 AM',  task:'Pack 12 veg boxes separately + label allergen', done:false, critical:false, assigned:'u005', note:'' },
  { id:11, station:'QC',    time:'10:30 AM', task:'Final quality check + portion count = 132', done:false, critical:true,  assigned:'u006', note:'' },
  { id:12, station:'LOAD',  time:'11:00 AM', task:'Load delivery vehicle + sign off', done:false, critical:true,  assigned:'u004', note:'' },
  { id:13, station:'ALL',   time:'11:30 AM', task:'Delivery complete — confirm 132 portions served', done:false, critical:true,  assigned:'u006', note:'' },
]

export default function ProductionPage() {
  const [tasks, setTasks] = useState(INITIAL_TASKS)
  const [now, setNow] = useState(new Date())
  const [activeEvent, setActiveEvent] = useState('Thu_132')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState<number|null>(null)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [noteText, setNoteText] = useState('')
  const [newTask, setNewTask] = useState({ station: 'GRILL', time: '', task: '', critical: false, assigned: 'u003' })

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])

  const done = tasks.filter(t => t.done).length
  const total = tasks.length
  const pct = Math.round((done / total) * 100)
  const criticalLeft = tasks.filter(t => t.critical && !t.done).length

  const stations = ['ALL','GRILL','PREP','RICE','PACK','HACCP','QC','LOAD']
  const stationColors: Record<string,string> = { ALL:'#64748B', GRILL:'#DC2626', PREP:'#D97706', RICE:'#059669', PACK:'#2563EB', HACCP:'#7C3AED', QC:'#EC4899', LOAD:'#0891B2' }

  function toggleTask(id: number) {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  function reassignTask(taskId: number, userId: string) {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, assigned: userId } : t))
  }

  function addNote(taskId: number) {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, note: noteText } : t))
    setShowNoteModal(null)
    setNoteText('')
  }

  function addNewTask() {
    const id = Math.max(...tasks.map(t => t.id)) + 1
    setTasks([...tasks, { ...newTask, id, done: false, note: '' }])
    setShowAddTaskModal(false)
    setNewTask({ station: 'GRILL', time: '', task: '', critical: false, assigned: 'u003' })
  }

  function getMember(userId: string) { return TEAM_MEMBERS.find(m => m.id === userId) }

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#1E2A45', color: '#E2E8F0', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100vh', background: '#060D1A' }}>

      {/* Note Modal */}
      {showNoteModal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0A0F1E', border: '1px solid #1E2A45', borderRadius: '12px', padding: '24px', width: '420px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF', marginBottom: '12px' }}>Add Note to Task</h3>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '10px' }}>
              {tasks.find(t => t.id === showNoteModal)?.task}
            </div>
            <textarea placeholder="Add note e.g. temp reading, issue, quantity..." style={{ ...inp, height: '80px', resize: 'vertical' as const }} value={noteText} onChange={e => setNoteText(e.target.value)} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => addNote(showNoteModal)} style={{ flex: 1, padding: '10px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Save Note</button>
              <button onClick={() => setShowNoteModal(null)} style={{ padding: '10px 16px', background: '#1E2A45', color: '#94A3B8', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0A0F1E', border: '1px solid #1E2A45', borderRadius: '12px', padding: '24px', width: '460px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF', marginBottom: '16px' }}>Add Task to Today's Production</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '5px' }}>Task Description *</label>
                <input type="text" placeholder="Describe the task..." style={inp} value={newTask.task} onChange={e => setNewTask({ ...newTask, task: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '5px' }}>Station</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={newTask.station} onChange={e => setNewTask({ ...newTask, station: e.target.value })}>
                    {stations.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '5px' }}>Time</label>
                  <input type="time" style={inp} value={newTask.time} onChange={e => setNewTask({ ...newTask, time: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '5px' }}>Assign To</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={newTask.assigned} onChange={e => setNewTask({ ...newTask, assigned: e.target.value })}>
                  {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="critical" checked={newTask.critical} onChange={e => setNewTask({ ...newTask, critical: e.target.checked })} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="critical" style={{ fontSize: '13px', color: '#E2E8F0', cursor: 'pointer' }}>Mark as CRITICAL task</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={addNewTask} style={{ flex: 1, padding: '11px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Add Task</button>
              <button onClick={() => setShowAddTaskModal(false)} style={{ padding: '11px 16px', background: '#1E2A45', color: '#94A3B8', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#0A0F1E', borderBottom: '1px solid #1E2A45', padding: '20px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>Production Mode</h1>
            <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · Thursday 132-pax · Cafe 71 · RS-10001
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowAddTaskModal(true)} style={{ padding: '9px 16px', background: '#1E3A5F', color: '#93C5FD', border: '1px solid #1E2A45', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ Add Task</button>
            <select style={{ padding: '8px 14px', background: '#1E2A45', color: '#E2E8F0', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }} value={activeEvent} onChange={e => setActiveEvent(e.target.value)}>
              <option value="Thu_132">Thu 132-pax · Chicken + Tofu</option>
              <option value="Fri_80">Fri 80-pax · Lamb Biryani</option>
            </select>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '14px' }}>
          {[
            { label: 'Tasks Done', value: `${done}/${total}`, color: '#86EFAC' },
            { label: 'Progress', value: `${pct}%`, color: pct < 50 ? '#FCA5A5' : pct < 80 ? '#FCD34D' : '#86EFAC' },
            { label: 'Critical Left', value: criticalLeft.toString(), color: criticalLeft > 0 ? '#FCA5A5' : '#86EFAC' },
            { label: 'Team On Duty', value: TEAM_MEMBERS.length.toString(), color: '#93C5FD' },
            { label: 'Delivery', value: '11:30 AM', color: '#FCD34D' },
          ].map(c => (
            <div key={c.label} style={{ background: '#1E2A45', borderRadius: '8px', padding: '12px', textAlign: 'center' as const }}>
              <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase' as const, marginBottom: '3px' }}>{c.label}</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ height: '10px', background: '#1E2A45', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct < 50 ? '#EF4444' : pct < 80 ? '#F59E0B' : '#10B981', borderRadius: '5px', transition: 'width 0.4s' }}></div>
        </div>

        {/* Team row */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase' as const }}>Team on duty:</span>
          {TEAM_MEMBERS.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#1E2A45', padding: '4px 10px', borderRadius: '20px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: 'white' }}>{m.initials}</div>
              <span style={{ fontSize: '12px', color: '#E2E8F0' }}>{m.name}</span>
              <span style={{ fontSize: '10px', color: '#475569' }}>{m.role}</span>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#86EFAC' }}>{tasks.filter(t => t.assigned === m.id && t.done).length}/{tasks.filter(t => t.assigned === m.id).length}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>

        {/* Task list */}
        <div>
          {stations.map(station => {
            const stTasks = tasks.filter(t => t.station === station)
            if (stTasks.length === 0) return null
            const stDone = stTasks.filter(t => t.done).length
            const color = stationColors[station]
            return (
              <div key={station} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }}></div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Station: {station}</span>
                  <span style={{ fontSize: '11px', color: '#334155' }}>{stDone}/{stTasks.length} done</span>
                  <div style={{ flex: 1, height: '4px', background: '#1E2A45', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${stTasks.length > 0 ? (stDone/stTasks.length)*100 : 0}%`, background: color, borderRadius: '2px' }}></div>
                  </div>
                </div>

                {stTasks.map(task => {
                  const member = getMember(task.assigned)
                  return (
                    <div key={task.id} style={{ marginBottom: '8px', borderRadius: '8px', border: `1px solid ${task.done ? '#1E2A45' : task.critical ? '#450A0A' : '#1E2A45'}`, background: task.done ? '#0A1628' : task.critical ? '#1A0A0A' : '#0A1628', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px' }}>
                        {/* Checkbox */}
                        <div onClick={() => toggleTask(task.id)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: `2px solid ${task.done ? '#10B981' : task.critical ? '#EF4444' : '#334155'}`, background: task.done ? '#10B981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          {task.done && <span style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>✓</span>}
                        </div>

                        {/* Task text */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                            <span style={{ fontSize: '14px', fontWeight: task.critical ? '600' : '400', color: task.done ? '#334155' : '#E2E8F0', textDecoration: task.done ? 'line-through' : 'none' }}>{task.task}</span>
                            {task.critical && !task.done && <span style={{ fontSize: '10px', fontWeight: '700', background: '#450A0A', color: '#FCA5A5', padding: '1px 6px', borderRadius: '4px' }}>CRITICAL</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '11px', color: '#475569' }}>{task.time}</span>
                            {task.note && <span style={{ fontSize: '11px', color: '#93C5FD', background: '#1E3A5F', padding: '1px 6px', borderRadius: '4px' }}>📝 {task.note}</span>}
                          </div>
                        </div>

                        {/* Assigned member */}
                        {member && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1E2A45', padding: '5px 10px', borderRadius: '6px' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: 'white' }}>{member.initials}</div>
                            <span style={{ fontSize: '12px', color: '#E2E8F0' }}>{member.name}</span>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => { setShowNoteModal(task.id); setNoteText(task.note) }} style={{ padding: '5px 8px', background: '#1E2A45', border: '1px solid #334155', borderRadius: '5px', color: '#93C5FD', cursor: 'pointer', fontSize: '12px' }}>📝</button>
                          <div style={{ position: 'relative' }}>
                            <select onChange={e => reassignTask(task.id, e.target.value)} value={task.assigned} style={{ padding: '5px 8px', background: '#1E2A45', border: '1px solid #334155', borderRadius: '5px', color: '#94A3B8', cursor: 'pointer', fontSize: '11px' }}>
                              {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                          </div>
                          <button onClick={() => toggleTask(task.id)} style={{ padding: '5px 10px', background: task.done ? '#1E2A45' : '#052E16', border: `1px solid ${task.done ? '#334155' : '#166534'}`, borderRadius: '5px', color: task.done ? '#64748B' : '#86EFAC', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                            {task.done ? 'Undo' : 'Done'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Team task summary */}
          <div style={{ background: '#0A0F1E', border: '1px solid #1E2A45', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#93C5FD', marginBottom: '12px', textTransform: 'uppercase' as const }}>Team Progress</div>
            {TEAM_MEMBERS.map(m => {
              const myTasks = tasks.filter(t => t.assigned === m.id)
              const myDone = myTasks.filter(t => t.done).length
              const myPct = myTasks.length > 0 ? Math.round((myDone/myTasks.length)*100) : 0
              return (
                <div key={m.id} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: 'white' }}>{m.initials}</div>
                      <span style={{ fontSize: '12px', color: '#E2E8F0' }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: myPct === 100 ? '#86EFAC' : '#FCD34D' }}>{myDone}/{myTasks.length}</span>
                  </div>
                  <div style={{ height: '5px', background: '#1E2A45', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${myPct}%`, background: m.color, borderRadius: '3px', transition: 'width 0.3s' }}></div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Batch targets */}
          <div style={{ background: '#0A0F1E', border: '1px solid #1E2A45', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#93C5FD', marginBottom: '10px', textTransform: 'uppercase' as const }}>Batch Targets</div>
            {[
              { item: 'Chicken Thigh', target: '56 lb', note: '→ 132 portions', color: '#FCD34D' },
              { item: 'Tofu', target: '10 lb', note: '→ veg portions', color: '#86EFAC' },
              { item: 'Basmati Rice', target: '45 lb', note: '→ 132 portions', color: '#86EFAC' },
              { item: 'Veg Boxes', target: '12 boxes', note: 'separate allergen label', color: '#93C5FD' },
            ].map(b => (
              <div key={b.item} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #1E2A45' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#E2E8F0', fontWeight: '500' }}>{b.item}</div>
                  <div style={{ fontSize: '11px', color: '#334155' }}>{b.note}</div>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '700', color: b.color }}>{b.target}</span>
              </div>
            ))}
          </div>

          {/* HACCP */}
          <div style={{ background: '#0A0F1E', border: '1px solid #1E2A45', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#93C5FD', marginBottom: '10px', textTransform: 'uppercase' as const }}>HACCP Temp Log</div>
            {[
              { item: 'Chicken — Grill', temp: '167°F', status: 'pass' },
              { item: 'Rice — Steam', temp: '185°F', status: 'pass' },
              { item: 'Fridge Hold', temp: '38°F', status: 'pass' },
              { item: 'Hot Hold', temp: '', status: 'pending' },
            ].map(t => (
              <div key={t.item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #1E2A45' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>{t.item}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {t.temp && <span style={{ fontSize: '13px', fontWeight: '700', color: '#E2E8F0' }}>{t.temp}</span>}
                  <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: t.status === 'pass' ? '#052E16' : '#1E2A45', color: t.status === 'pass' ? '#86EFAC' : '#64748B' }}>
                    {t.status === 'pass' ? 'PASS' : 'LOG'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button style={{ padding: '12px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }} onClick={() => window.location.href = '/yield'}>
              Log Yield Now
            </button>
            <button style={{ padding: '12px', background: '#1E3A5F', color: '#93C5FD', border: '1px solid #1E2A45', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }} onClick={() => window.location.href = '/waste'}>
              Add Waste Entry
            </button>
            <button onClick={() => setShowAddTaskModal(true)} style={{ padding: '12px', background: '#1E2A45', color: '#E2E8F0', border: '1px solid #334155', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
              + Add Task
            </button>
            <button
              onClick={() => {
                const printWin = window.open('', '_blank')
                if (!printWin) return
                const stationsHTML = ['ALL','GRILL','PREP','RICE','PACK','HACCP','QC','LOAD'].map(station => {
                  const stTasks = tasks.filter((t: any) => t.station === station)
                  if (stTasks.length === 0) return ''
                  return '<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:bold;text-transform:uppercase;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:8px">STATION: ' + station + ' (' + stTasks.filter((t:any)=>t.done).length + '/' + stTasks.length + ')</div>' +
                    stTasks.map((task: any) => {
                      const member = TEAM_MEMBERS.find((m: any) => m.id === task.assigned)
                      return '<div style="display:flex;gap:8px;margin-bottom:8px;padding:8px;border:1px solid ' + (task.critical?'#e00':'#ccc') + ';border-radius:4px;background:' + (task.done?'#f5f5f5':task.critical?'#fff5f5':'white') + '">' +
                        '<div style="width:16px;height:16px;border:2px solid #000;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px">' + (task.done?'✓':'') + '</div>' +
                        '<div><div style="' + (task.done?'text-decoration:line-through;color:#999':'') + '">' + task.task + (task.critical?' <b style=\"color:#e00\">CRITICAL</b>':'') + '</div>' +
                        '<div style="font-size:10px;color:#666">' + task.time + ' · ' + (member?.name||'Unassigned') + '</div>' +
                        (task.note ? '<div style="font-size:10px;color:#555">Note: ' + task.note + '</div>' : '') +
                        '</div></div>'
                    }).join('') + '</div>'
                }).join('')
                printWin.document.write('<html><head><title>Production Checklist</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}@media print{body{padding:10px}}</style></head><body>' +
                  '<h1 style="font-size:18px;margin-bottom:4px">Production Checklist</h1>' +
                  '<p style="color:#666;margin-bottom:16px">' + new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) + ' · Cafe 71 · RS-10001</p>' +
                  '<div style="display:flex;gap:12px;margin-bottom:20px">' +
                  '<div style="border:1px solid #ccc;padding:8px 16px;border-radius:4px;text-align:center"><div style="font-size:20px;font-weight:bold">' + done + '/' + total + '</div><div style="font-size:10px;color:#666">Tasks Done</div></div>' +
                  '<div style="border:1px solid #ccc;padding:8px 16px;border-radius:4px;text-align:center"><div style="font-size:20px;font-weight:bold">' + pct + '%</div><div style="font-size:10px;color:#666">Progress</div></div>' +
                  '<div style="border:1px solid #ccc;padding:8px 16px;border-radius:4px;text-align:center"><div style="font-size:20px;font-weight:bold">' + criticalLeft + '</div><div style="font-size:10px;color:#666">Critical Left</div></div>' +
                  '</div>' +
                  stationsHTML +
                  '<div style="margin-top:24px;font-size:10px;color:#999;border-top:1px solid #ccc;padding-top:8px">Printed by iBirdOS · ' + new Date().toLocaleString() + '</div>' +
                  '</body></html>')
                printWin.document.close()
                printWin.focus()
                setTimeout(() => printWin.print(), 400)
              }}
              style={{ padding: '12px', background: '#1E2A45', color: '#E2E8F0', border: '1px solid #334155', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
            >
              Print Checklist
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}