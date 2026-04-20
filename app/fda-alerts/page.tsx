'use client'
import { useState } from 'react'

export default function FDAPage() {
  const [alerts, setAlerts] = useState([
    { id: 1, severity: 'urgent', product: 'Romaine Lettuce', brand: 'Dole Fresh Vegetables', issue: 'E. coli O157:H7 contamination', lot: 'Lot #D-224-26, Best By Apr 22 2026', action: 'Remove from menu immediately. Check Sysco INV-2891.', date: 'Apr 18, 2026', affected: 'WA, OR, CA, BC', resolved: false, removed: false },
    { id: 2, severity: 'warning', product: 'Ground Beef 80/20', brand: 'National Beef Packing Co.', issue: 'Salmonella advisory — voluntary recall', lot: 'Est. 123A, Production dates Apr 1-10', action: 'Verify supplier. Hold product pending test results.', date: 'Apr 16, 2026', affected: 'WA, OR, ID', resolved: false, removed: false },
    { id: 3, severity: 'info', product: 'Frozen Shrimp', brand: 'SeaPak Shrimp Co.', issue: 'Undeclared allergen — wheat in breading', lot: 'UPC 047600-700150', action: 'Check labels. Alert staff on allergen protocol.', date: 'Apr 14, 2026', affected: 'Nationwide', resolved: false, removed: false },
  ])

  const [workflow, setWorkflow] = useState<number | null>(null)

  function markResolved(id: number) {
    setAlerts(alerts.map(a => a.id === id ? { ...a, resolved: true } : a))
    setWorkflow(null)
  }

  function removeFromInventory(id: number) {
    setAlerts(alerts.map(a => a.id === id ? { ...a, removed: true, resolved: true } : a))
    setWorkflow(null)
  }

  const active = alerts.filter(a => !a.resolved)
  const resolved = alerts.filter(a => a.resolved)

  return (
    <div style={{ padding: '32px', background: '#F8FAFC', minHeight: '100vh' }}>

      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#0F172A' }}>FDA Recall Alerts</h1>
          <p style={{ fontSize: '14px', color: '#94A3B8', marginTop: '4px' }}>
            Live food safety alerts · Sent from noreply@ibirdos.com · Next scan in 3h 42m
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ background: '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px' }}>{active.filter(a => a.severity === 'urgent').length} Urgent</span>
          <span style={{ background: '#FFFBEB', color: '#D97706', fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px' }}>{active.filter(a => a.severity === 'warning').length} Warning</span>
          <span style={{ background: '#EFF6FF', color: '#2563EB', fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px' }}>{active.filter(a => a.severity === 'info').length} Info</span>
        </div>
      </div>

      {/* Active alerts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {active.map(alert => (
          <div key={alert.id}>
            <div style={{
              background: '#FFFFFF',
              border: `1px solid ${alert.severity === 'urgent' ? '#FECACA' : alert.severity === 'warning' ? '#FDE68A' : '#BFDBFE'}`,
              borderLeft: `4px solid ${alert.severity === 'urgent' ? '#DC2626' : alert.severity === 'warning' ? '#D97706' : '#2563EB'}`,
              borderRadius: '8px', padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '22px' }}>
                    {alert.severity === 'urgent' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
                  </span>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0F172A' }}>{alert.product}</h3>
                    <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>{alert.brand}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    background: alert.severity === 'urgent' ? '#FEF2F2' : alert.severity === 'warning' ? '#FFFBEB' : '#EFF6FF',
                    color: alert.severity === 'urgent' ? '#DC2626' : alert.severity === 'warning' ? '#D97706' : '#2563EB',
                    fontSize: '11px', fontWeight: '700', padding: '3px 10px',
                    borderRadius: '20px', textTransform: 'uppercase' as const
                  }}>{alert.severity}</span>
                  <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>{alert.date}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' as const, marginBottom: '4px' }}>Issue</div>
                  <div style={{ fontSize: '13px', color: '#0F172A' }}>{alert.issue}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' as const, marginBottom: '4px' }}>Lot / UPC</div>
                  <div style={{ fontSize: '13px', color: '#0F172A' }}>{alert.lot}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' as const, marginBottom: '4px' }}>Affected States</div>
                  <div style={{ fontSize: '13px', color: '#0F172A' }}>{alert.affected}</div>
                </div>
              </div>

              <div style={{
                background: alert.severity === 'urgent' ? '#FEF2F2' : '#F8FAFC',
                borderRadius: '6px', padding: '12px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ fontSize: '13px', color: '#374151' }}>
                  <strong>Required action: </strong>{alert.action}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginLeft: '16px', flexShrink: 0 }}>
                  <button
                    onClick={() => setWorkflow(workflow === alert.id ? null : alert.id)}
                    style={{
                      background: '#0A0F1E', color: 'white', border: 'none',
                      borderRadius: '6px', padding: '7px 14px',
                      fontSize: '12px', fontWeight: '500', cursor: 'pointer'
                    }}>Resolve ▾</button>
                </div>
              </div>

              {/* Workflow dropdown */}
              {workflow === alert.id && (
                <div style={{ marginTop: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', marginBottom: '12px' }}>
                    Choose resolution action:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={() => markResolved(alert.id)}
                      style={{
                        textAlign: 'left' as const, padding: '12px 14px',
                        background: '#FFFFFF', border: '1px solid #E2E8F0',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
                      }}>
                      <strong style={{ color: '#059669' }}>✓ Mark Resolved</strong>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Alert acknowledged. Product verified safe or substituted.</div>
                    </button>
                    <button
                      onClick={() => removeFromInventory(alert.id)}
                      style={{
                        textAlign: 'left' as const, padding: '12px 14px',
                        background: '#FFFFFF', border: '1px solid #FECACA',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
                      }}>
                      <strong style={{ color: '#DC2626' }}>🗑 Remove from Inventory + Mark as Waste</strong>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Pulls product from inventory count and logs as waste in waste tracking.</div>
                    </button>
                    <button
                      onClick={() => setWorkflow(null)}
                      style={{
                        padding: '8px 14px', background: 'transparent',
                        border: '1px solid #E2E8F0', borderRadius: '6px',
                        cursor: 'pointer', fontSize: '12px', color: '#64748B'
                      }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Resolved section */}
      {resolved.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#94A3B8', marginBottom: '12px' }}>RESOLVED ({resolved.length})</h3>
          {resolved.map(alert => (
            <div key={alert.id} style={{
              background: '#F8FAFC', border: '1px solid #E2E8F0',
              borderRadius: '8px', padding: '14px 20px', marginBottom: '8px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7
            }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748B' }}>✓ {alert.product}</span>
                {alert.removed && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#DC2626' }}>· Removed from inventory + logged as waste</span>}
              </div>
              <span style={{ background: '#F0FDF4', color: '#166534', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>Resolved</span>
            </div>
          ))}
        </div>
      )}

      {/* Email log */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A', marginBottom: '16px' }}>Alert Email Log</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Sent To', 'Subject', 'Time', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' as const, textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { to: 'CEO@prosperityaxis.com', subject: 'URGENT: Romaine E.coli Recall — Cafe 71', time: 'Today 6:14 AM', status: 'Delivered' },
              { to: 'CEO@prosperityaxis.com', subject: 'FDA Advisory: Ground Beef Salmonella — WA', time: 'Apr 16 7:02 AM', status: 'Delivered' },
              { to: 'CEO@prosperityaxis.com', subject: 'FDA Info: SeaPak Shrimp Allergen Label', time: 'Apr 14 6:58 AM', status: 'Delivered' },
            ].map((row, i) => (
              <tr key={i}>
                <td style={{ padding: '12px', fontSize: '13px', color: '#0F172A', borderBottom: '1px solid #F1F5F9' }}>{row.to}</td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>{row.subject}</td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>{row.time}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ background: '#F0FDF4', color: '#166534', fontSize: '12px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px' }}>{row.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}