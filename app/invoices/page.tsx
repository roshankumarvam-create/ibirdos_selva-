'use client'
import { useState } from 'react'

type PaymentMethod = 'evia' | 'ach' | 'credit_card' | 'check' | 'wire'
type InvoiceType = 'payable' | 'receivable'

interface Invoice {
  id: number
  type: InvoiceType
  vendor_customer: string
  invoice_no: string
  date: string
  due_date: string
  items: number
  total: number
  status: 'extracted' | 'pending' | 'approved' | 'paid' | 'overdue' | 'sent' | 'partial'
  ai_status: 'extracted' | 'pending'
  fda_alert?: boolean
  gl_posted?: boolean
  payment_method?: PaymentMethod
  paid_amount?: number
}

const INVOICES: Invoice[] = [
  // Payables (what we owe vendors)
  { id:1, type:'payable', vendor_customer:'Sysco Food Service', invoice_no:'755148608', date:'Apr 16', due_date:'May 1', items:24, total:3218, status:'approved', ai_status:'extracted', fda_alert:true, gl_posted:true },
  { id:2, type:'payable', vendor_customer:'Sysco Food Service', invoice_no:'755148607', date:'Apr 9', due_date:'Apr 24', items:18, total:2904, status:'paid', ai_status:'extracted', payment_method:'evia', paid_amount:2904 },
  { id:3, type:'payable', vendor_customer:'US Foods', invoice_no:'USF-44192', date:'Apr 8', due_date:'Apr 22', items:11, total:1445, status:'pending', ai_status:'pending' },
  { id:4, type:'payable', vendor_customer:'Cash & Carry', invoice_no:'CC-7721', date:'Apr 5', due_date:'Apr 19', items:9, total:612, status:'overdue', ai_status:'extracted', gl_posted:true },
  // Receivables (what customers owe us)
  { id:5, type:'receivable', vendor_customer:'Microsoft Corp Cafeteria', invoice_no:'IB-INV-001', date:'Apr 15', due_date:'May 15', items:6, total:8400, status:'sent', ai_status:'extracted', gl_posted:true },
  { id:6, type:'receivable', vendor_customer:'Amazon HQ Catering', invoice_no:'IB-INV-002', date:'Apr 12', due_date:'May 12', items:8, total:12600, status:'partial', ai_status:'extracted', paid_amount:6300, gl_posted:true },
  { id:7, type:'receivable', vendor_customer:'Boeing Event Catering', invoice_no:'IB-INV-003', date:'Apr 5', due_date:'Apr 20', items:4, total:4200, status:'overdue', ai_status:'extracted', gl_posted:true },
]

const CUSTOMER_PROFILES: Record<string, { name: string; email: string; card_last4: string; card_type: string; ach_account: string; credit_limit: number; outstanding: number }> = {
  'Microsoft Corp Cafeteria': { name: 'Microsoft Corp', email: 'ap@microsoft.com', card_last4: '4521', card_type: 'Visa', ach_account: '****7890', credit_limit: 50000, outstanding: 8400 },
  'Amazon HQ Catering': { name: 'Amazon HQ', email: 'catering@amazon.com', card_last4: '8832', card_type: 'Amex', ach_account: '****3421', credit_limit: 75000, outstanding: 6300 },
  'Boeing Event Catering': { name: 'Boeing Events', email: 'events@boeing.com', card_last4: '2219', card_type: 'MC', ach_account: '****5567', credit_limit: 30000, outstanding: 4200 },
}

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<'payable'|'receivable'>('payable')
  const [invoices, setInvoices] = useState(INVOICES)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice|null>(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showChargeModal, setShowChargeModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('evia')
  const [payAmount, setPayAmount] = useState('')
  const [payRef, setPayRef] = useState('')
  const [processing, setProcessing] = useState(false)
  const [processedId, setProcessedId] = useState<number|null>(null)
  const [chargeMethod, setChargeMethod] = useState<'card'|'ach'>('card')
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)

  const payables = invoices.filter(i => i.type === 'payable')
  const receivables = invoices.filter(i => i.type === 'receivable')
  const totalPayable = payables.filter(i => i.status !== 'paid').reduce((s,i) => s+i.total,0)
  const totalReceivable = receivables.filter(i => i.status !== 'paid').reduce((s,i) => s+i.total,0)
  const overdue = invoices.filter(i => i.status === 'overdue')

  async function handlePayVendor() {
    if (!selectedInvoice) return
    setProcessing(true)
    await new Promise(r => setTimeout(r, 1800))
    setInvoices(invs => invs.map(i => i.id === selectedInvoice.id ? { ...i, status: 'paid', payment_method: paymentMethod, paid_amount: Number(payAmount) || i.total } : i))
    setProcessedId(selectedInvoice.id)
    setProcessing(false)
    setTimeout(() => { setShowPayModal(false); setProcessedId(null); setPayAmount(''); setPayRef('') }, 1500)
  }

  async function handleChargeCustomer() {
    if (!selectedInvoice) return
    setProcessing(true)
    await new Promise(r => setTimeout(r, 2000))
    setInvoices(invs => invs.map(i => i.id === selectedInvoice.id ? { ...i, status: 'paid', payment_method: chargeMethod === 'card' ? 'credit_card' : 'ach', paid_amount: i.total } : i))
    setProcessedId(selectedInvoice.id)
    setProcessing(false)
    setTimeout(() => { setShowChargeModal(false); setProcessedId(null) }, 1500)
  }

  async function handleUpload() {
    setUploading(true)
    await new Promise(r => setTimeout(r, 2000))
    setUploading(false)
    setUploadDone(true)
    setTimeout(() => { setUploadDone(false); setShowUploadModal(false) }, 2000)
  }

  const statusColor: Record<string, { bg: string; color: string }> = {
    extracted: { bg: '#F0FDF4', color: '#166534' },
    pending:   { bg: '#FFFBEB', color: '#92400E' },
    approved:  { bg: '#EFF6FF', color: '#1E40AF' },
    paid:      { bg: '#F0FDF4', color: '#166534' },
    overdue:   { bg: '#FEF2F2', color: '#DC2626' },
    sent:      { bg: '#EFF6FF', color: '#1E40AF' },
    partial:   { bg: '#FFF7ED', color: '#C2410C' },
  }

  const pmLabel: Record<string, string> = { evia:'eVia', ach:'ACH Bank', credit_card:'Credit Card', check:'Check', wire:'Wire Transfer' }

  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #E2E8F0', borderRadius:'6px', fontSize:'13px', outline:'none', background:'#FFFFFF', color:'#0F172A', boxSizing:'border-box' as const }

  return (
    <div style={{ minHeight:'100vh', background:'#F1F5F9' }}>

      {/* PAY VENDOR MODAL */}
      {showPayModal && selectedInvoice && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#FFFFFF', borderRadius:'14px', padding:'28px', width:'500px', boxShadow:'0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
              <div>
                <h3 style={{ fontSize:'17px', fontWeight:'700', color:'#0F172A', marginBottom:'4px' }}>Pay Vendor Invoice</h3>
                <div style={{ fontSize:'13px', color:'#64748B' }}>{selectedInvoice.vendor_customer} · {selectedInvoice.invoice_no}</div>
              </div>
              <div style={{ textAlign:'right' as const }}>
                <div style={{ fontSize:'24px', fontWeight:'800', color:'#DC2626' }}>${selectedInvoice.total.toLocaleString()}</div>
                <div style={{ fontSize:'11px', color:'#94A3B8' }}>Due {selectedInvoice.due_date}</div>
              </div>
            </div>

            {/* FDA alert warning */}
            {selectedInvoice.fda_alert && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'8px', padding:'12px 14px', marginBottom:'16px', display:'flex', gap:'8px', alignItems:'flex-start' }}>
                <span style={{ fontSize:'16px', flexShrink:0 }}>⚠️</span>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:'600', color:'#DC2626' }}>FDA Recall Item Detected</div>
                  <div style={{ fontSize:'12px', color:'#DC2626' }}>Romaine Lettuce on this invoice is under recall. Remove from inventory before approving payment.</div>
                </div>
              </div>
            )}

            {/* Payment method */}
            <div style={{ marginBottom:'16px' }}>
              <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', display:'block', marginBottom:'8px' }}>Payment Method</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {([
                  { id:'evia', label:'eVia', sub:'Sysco preferred', icon:'🔗' },
                  { id:'ach', label:'ACH Bank Transfer', sub:'2-3 business days', icon:'🏦' },
                  { id:'credit_card', label:'Credit Card', sub:'Immediate', icon:'💳' },
                  { id:'check', label:'Check', sub:'Mail payment', icon:'📄' },
                ] as const).map(m => (
                  <div key={m.id} onClick={() => setPaymentMethod(m.id)} style={{ padding:'12px', borderRadius:'8px', cursor:'pointer', border:`2px solid ${paymentMethod === m.id ? '#2563EB' : '#E2E8F0'}`, background: paymentMethod === m.id ? '#EFF6FF' : '#FAFAFA' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <span style={{ fontSize:'16px' }}>{m.icon}</span>
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:'600', color: paymentMethod === m.id ? '#1E40AF' : '#0F172A' }}>{m.label}</div>
                        <div style={{ fontSize:'11px', color:'#64748B' }}>{m.sub}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'500', color:'#374151', display:'block', marginBottom:'5px' }}>Payment Amount ($)</label>
                <input type="number" placeholder={selectedInvoice.total.toString()} style={inp} value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'500', color:'#374151', display:'block', marginBottom:'5px' }}>Reference / Check No.</label>
                <input type="text" placeholder="Auto-generated..." style={inp} value={payRef} onChange={e => setPayRef(e.target.value)} />
              </div>
            </div>

            {paymentMethod === 'evia' && (
              <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:'8px', padding:'12px 14px', marginBottom:'16px' }}>
                <div style={{ fontSize:'13px', fontWeight:'600', color:'#1E40AF', marginBottom:'4px' }}>eVia Payment — Sysco Direct</div>
                <div style={{ fontSize:'12px', color:'#2563EB' }}>Payment will route through eVia directly to Sysco. Cleared within 1 business day. Auto-posts to GL IB-4111/IB-4112.</div>
              </div>
            )}

            {processedId === selectedInvoice.id ? (
              <div style={{ padding:'14px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'8px', textAlign:'center' as const, fontSize:'15px', fontWeight:'700', color:'#166534' }}>
                ✓ Payment Processed via {pmLabel[paymentMethod]}
              </div>
            ) : (
              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={handlePayVendor} disabled={processing} style={{ flex:1, padding:'12px', background: processing ? '#93C5FD' : '#2563EB', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
                  {processing ? 'Processing Payment...' : `Pay $${Number(payAmount) || selectedInvoice.total} via ${pmLabel[paymentMethod]}`}
                </button>
                <button onClick={() => setShowPayModal(false)} style={{ padding:'12px 18px', background:'#F8FAFC', color:'#475569', border:'1px solid #E2E8F0', borderRadius:'8px', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHARGE CUSTOMER MODAL */}
      {showChargeModal && selectedInvoice && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#FFFFFF', borderRadius:'14px', padding:'28px', width:'520px', boxShadow:'0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
              <div>
                <h3 style={{ fontSize:'17px', fontWeight:'700', color:'#0F172A', marginBottom:'4px' }}>Collect Payment</h3>
                <div style={{ fontSize:'13px', color:'#64748B' }}>{selectedInvoice.vendor_customer} · {selectedInvoice.invoice_no}</div>
              </div>
              <div style={{ textAlign:'right' as const }}>
                <div style={{ fontSize:'24px', fontWeight:'800', color:'#059669' }}>${(selectedInvoice.total - (selectedInvoice.paid_amount||0)).toLocaleString()}</div>
                <div style={{ fontSize:'11px', color:'#94A3B8' }}>Outstanding</div>
              </div>
            </div>

            {/* Customer profile */}
            {CUSTOMER_PROFILES[selectedInvoice.vendor_customer] && (
              <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'8px', padding:'14px', marginBottom:'16px' }}>
                <div style={{ fontSize:'12px', fontWeight:'600', color:'#0F172A', marginBottom:'8px' }}>Customer Profile</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', fontSize:'12px' }}>
                  <div><span style={{ color:'#64748B' }}>Email: </span><span style={{ color:'#0F172A' }}>{CUSTOMER_PROFILES[selectedInvoice.vendor_customer].email}</span></div>
                  <div><span style={{ color:'#64748B' }}>Credit Limit: </span><span style={{ color:'#0F172A', fontWeight:'600' }}>${CUSTOMER_PROFILES[selectedInvoice.vendor_customer].credit_limit.toLocaleString()}</span></div>
                  <div><span style={{ color:'#64748B' }}>Card on file: </span><span style={{ color:'#0F172A' }}>•••• {CUSTOMER_PROFILES[selectedInvoice.vendor_customer].card_last4} ({CUSTOMER_PROFILES[selectedInvoice.vendor_customer].card_type})</span></div>
                  <div><span style={{ color:'#64748B' }}>ACH on file: </span><span style={{ color:'#0F172A' }}>{CUSTOMER_PROFILES[selectedInvoice.vendor_customer].ach_account}</span></div>
                </div>
              </div>
            )}

            {/* Charge method */}
            <div style={{ marginBottom:'16px' }}>
              <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', display:'block', marginBottom:'8px' }}>Charge Method</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {([
                  { id:'card', label:'Charge Credit Card', sub:'Instant · Card on file', icon:'💳' },
                  { id:'ach', label:'ACH Bank Debit', sub:'2-3 days · Bank on file', icon:'🏦' },
                ] as const).map(m => (
                  <div key={m.id} onClick={() => setChargeMethod(m.id)} style={{ padding:'14px', borderRadius:'8px', cursor:'pointer', border:`2px solid ${chargeMethod === m.id ? '#059669' : '#E2E8F0'}`, background: chargeMethod === m.id ? '#F0FDF4' : '#FAFAFA' }}>
                    <span style={{ fontSize:'18px' }}>{m.icon}</span>
                    <div style={{ fontSize:'13px', fontWeight:'600', color: chargeMethod === m.id ? '#166534' : '#0F172A', marginTop:'6px' }}>{m.label}</div>
                    <div style={{ fontSize:'11px', color:'#64748B' }}>{m.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {chargeMethod === 'card' && CUSTOMER_PROFILES[selectedInvoice.vendor_customer] && (
              <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'8px', padding:'12px 14px', marginBottom:'16px' }}>
                <div style={{ fontSize:'13px', fontWeight:'600', color:'#166534' }}>
                  Charging {CUSTOMER_PROFILES[selectedInvoice.vendor_customer].card_type} •••• {CUSTOMER_PROFILES[selectedInvoice.vendor_customer].card_last4}
                </div>
                <div style={{ fontSize:'12px', color:'#166534', marginTop:'2px' }}>Amount: ${(selectedInvoice.total - (selectedInvoice.paid_amount||0)).toLocaleString()} · Auto-receipt to {CUSTOMER_PROFILES[selectedInvoice.vendor_customer].email}</div>
              </div>
            )}

            {processedId === selectedInvoice.id ? (
              <div style={{ padding:'14px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:'8px', textAlign:'center' as const, fontSize:'15px', fontWeight:'700', color:'#166534' }}>
                ✓ Payment Collected · Receipt Sent
              </div>
            ) : (
              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={handleChargeCustomer} disabled={processing} style={{ flex:1, padding:'12px', background: processing ? '#6EE7B7' : '#059669', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
                  {processing ? 'Processing...' : `Collect $${(selectedInvoice.total - (selectedInvoice.paid_amount||0)).toLocaleString()} via ${chargeMethod === 'card' ? 'Card' : 'ACH'}`}
                </button>
                <button onClick={() => setShowChargeModal(false)} style={{ padding:'12px 18px', background:'#F8FAFC', color:'#475569', border:'1px solid #E2E8F0', borderRadius:'8px', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#FFFFFF', borderRadius:'14px', padding:'28px', width:'460px', boxShadow:'0 24px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize:'16px', fontWeight:'700', color:'#0F172A', marginBottom:'16px' }}>Upload Invoice PDF</h3>
            <div onClick={handleUpload} style={{ border:'2px dashed #CBD5E1', borderRadius:'10px', padding:'36px', textAlign:'center' as const, cursor:'pointer', background:'#F8FAFC', marginBottom:'16px' }}>
              {uploading ? (
                <div>
                  <div style={{ fontSize:'13px', color:'#2563EB', fontWeight:'600', marginBottom:'8px' }}>AI extracting invoice data...</div>
                  <div style={{ height:'6px', background:'#BFDBFE', borderRadius:'3px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:'75%', background:'#2563EB', borderRadius:'3px' }}></div>
                  </div>
                </div>
              ) : uploadDone ? (
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#166534' }}>✓ Extracted · GL codes assigned · Ready to review</div>
              ) : (
                <>
                  <div style={{ fontSize:'32px', marginBottom:'8px' }}>📄</div>
                  <div style={{ fontSize:'14px', fontWeight:'500', color:'#475569' }}>Click to upload Sysco or US Foods PDF</div>
                  <div style={{ fontSize:'12px', color:'#94A3B8', marginTop:'4px' }}>AI extracts all line items · auto GL-codes · FDA checks</div>
                </>
              )}
            </div>
            <button onClick={() => setShowUploadModal(false)} style={{ width:'100%', padding:'11px', background:'#F8FAFC', color:'#475569', border:'1px solid #E2E8F0', borderRadius:'8px', fontSize:'13px', cursor:'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0F172A 0%,#1E3A5F 100%)', padding:'24px 32px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:'700', color:'#FFFFFF', margin:0 }}>Invoice Processing</h1>
            <p style={{ fontSize:'13px', color:'#93C5FD', marginTop:'4px' }}>AP Payables · AR Receivables · eVia · ACH · Card Charging · Owner/Manager only</p>
          </div>
          <button onClick={() => setShowUploadModal(true)} style={{ padding:'10px 20px', background:'#2563EB', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>+ Upload Invoice PDF</button>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginTop:'20px' }}>
          {[
            { label:'Total Payable', value:`$${totalPayable.toLocaleString()}`, sub:'Owed to vendors', color:'#FCA5A5' },
            { label:'Total Receivable', value:`$${totalReceivable.toLocaleString()}`, sub:'Owed by customers', color:'#86EFAC' },
            { label:'Overdue', value:overdue.length.toString(), sub:'Needs immediate action', color: overdue.length > 0 ? '#FCA5A5' : '#86EFAC' },
            { label:'AI Extraction Rate', value:'98.2%', sub:'Avg 2.1s per invoice', color:'#93C5FD' },
          ].map(c => (
            <div key={c.label} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'14px' }}>
              <div style={{ fontSize:'11px', color:'#94A3B8', textTransform:'uppercase' as const, marginBottom:'4px' }}>{c.label}</div>
              <div style={{ fontSize:'22px', fontWeight:'700', color:c.color }}>{c.value}</div>
              <div style={{ fontSize:'11px', color:'#475569', marginTop:'2px' }}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 32px' }}>

        {/* Tab switch */}
        <div style={{ display:'flex', background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:'10px', overflow:'hidden', marginBottom:'16px' }}>
          {([
            { id:'payable', label:'Accounts Payable', sub:'Vendor invoices to pay', icon:'💸', count: payables.length },
            { id:'receivable', label:'Accounts Receivable', sub:'Customer invoices to collect', icon:'💰', count: receivables.length },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex:1, padding:'16px 20px', border:'none', cursor:'pointer', background: activeTab === tab.id ? '#EFF6FF' : '#FFFFFF', borderBottom: activeTab === tab.id ? '3px solid #2563EB' : '3px solid transparent', textAlign:'left' as const }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ fontSize:'18px' }}>{tab.icon}</span>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:'700', color: activeTab === tab.id ? '#1E40AF' : '#0F172A' }}>{tab.label}</div>
                  <div style={{ fontSize:'12px', color:'#64748B' }}>{tab.sub} · {tab.count} invoices</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Invoice table */}
        <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:'10px', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ fontSize:'14px', fontWeight:'600', color:'#0F172A' }}>
              {activeTab === 'payable' ? 'Vendor Invoices — Accounts Payable' : 'Customer Invoices — Accounts Receivable'}
            </h3>
            <div style={{ fontSize:'13px', color:'#64748B' }}>
              {activeTab === 'payable'
                ? `Total outstanding: $${totalPayable.toLocaleString()}`
                : `Total to collect: $${totalReceivable.toLocaleString()}`
              }
            </div>
          </div>

          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F8FAFC' }}>
                {[
                  activeTab === 'payable' ? 'Vendor' : 'Customer',
                  'Invoice #','Date','Due Date','Items','Amount',
                  activeTab === 'payable' ? 'GL Posted' : 'Collected',
                  'Status','AI','Action'
                ].map(h => (
                  <th key={h} style={{ padding:'10px 14px', fontSize:'11px', fontWeight:'600', color:'#94A3B8', textAlign:'left' as const, borderBottom:'1px solid #E2E8F0', textTransform:'uppercase' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.filter(i => i.type === activeTab).map(inv => (
                <tr key={inv.id} style={{ borderBottom:'1px solid #F1F5F9', background: inv.status === 'overdue' ? '#FFF7ED' : 'white' }}>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ fontSize:'13px', fontWeight:'500', color:'#0F172A' }}>{inv.vendor_customer}</div>
                    {inv.fda_alert && <span style={{ fontSize:'10px', color:'#DC2626', background:'#FEF2F2', padding:'1px 6px', borderRadius:'3px', fontWeight:'600' }}>⚠ FDA Alert</span>}
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:'13px', color:'#2563EB', fontWeight:'500' }}>{inv.invoice_no}</td>
                  <td style={{ padding:'12px 14px', fontSize:'13px', color:'#475569' }}>{inv.date}</td>
                  <td style={{ padding:'12px 14px', fontSize:'13px', color: inv.status === 'overdue' ? '#DC2626' : '#475569', fontWeight: inv.status === 'overdue' ? '700' : '400' }}>{inv.due_date}</td>
                  <td style={{ padding:'12px 14px', fontSize:'13px', color:'#475569' }}>{inv.items}</td>
                  <td style={{ padding:'12px 14px', fontSize:'14px', fontWeight:'700', color:'#0F172A' }}>
                    ${inv.total.toLocaleString()}
                    {inv.paid_amount && inv.paid_amount < inv.total && (
                      <div style={{ fontSize:'11px', color:'#059669' }}>Paid: ${inv.paid_amount.toLocaleString()}</div>
                    )}
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    {inv.gl_posted
                      ? <span style={{ fontSize:'11px', color:'#059669', fontWeight:'600' }}>✓ Posted</span>
                      : <span style={{ fontSize:'11px', color:'#94A3B8' }}>Pending</span>
                    }
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ fontSize:'11px', fontWeight:'600', padding:'3px 8px', borderRadius:'4px', background:statusColor[inv.status]?.bg, color:statusColor[inv.status]?.color }}>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                    {inv.payment_method && (
                      <div style={{ fontSize:'10px', color:'#64748B', marginTop:'2px' }}>via {pmLabel[inv.payment_method]}</div>
                    )}
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ fontSize:'11px', fontWeight:'600', padding:'2px 7px', borderRadius:'4px', background:inv.ai_status==='extracted'?'#F0FDF4':'#FFFBEB', color:inv.ai_status==='extracted'?'#166534':'#92400E' }}>
                      {inv.ai_status === 'extracted' ? '✓ AI Extracted' : '⏳ Pending'}
                    </span>
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' as const }}>
                      <button onClick={() => setSelectedInvoice(inv)} style={{ padding:'5px 10px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'5px', fontSize:'12px', color:'#475569', cursor:'pointer' }}>View</button>
                      {activeTab === 'payable' && inv.status !== 'paid' && (
                        <button onClick={() => { setSelectedInvoice(inv); setPayAmount(inv.total.toString()); setShowPayModal(true) }} style={{ padding:'5px 10px', background:'#2563EB', border:'none', borderRadius:'5px', fontSize:'12px', color:'white', fontWeight:'600', cursor:'pointer' }}>Pay</button>
                      )}
                      {activeTab === 'receivable' && inv.status !== 'paid' && (
                        <button onClick={() => { setSelectedInvoice(inv); setShowChargeModal(true) }} style={{ padding:'5px 10px', background:'#059669', border:'none', borderRadius:'5px', fontSize:'12px', color:'white', fontWeight:'600', cursor:'pointer' }}>Collect</button>
                      )}
                      {inv.status === 'paid' && (
                        <span style={{ fontSize:'11px', color:'#059669', fontWeight:'600', padding:'5px 6px' }}>✓ Done</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick payment summary */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginTop:'16px' }}>
          <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:'10px', padding:'20px' }}>
            <h3 style={{ fontSize:'14px', fontWeight:'600', color:'#0F172A', marginBottom:'14px' }}>Payment Methods Available</h3>
            {[
              { icon:'🔗', name:'eVia', desc:'Direct to Sysco/US Foods — 1 business day', badge:'Preferred', color:'#2563EB' },
              { icon:'🏦', name:'ACH Bank Transfer', desc:'Bank to bank — 2-3 business days', badge:'Low cost', color:'#059669' },
              { icon:'💳', name:'Credit Card Charge', desc:'Customer card on file — instant', badge:'Receivable', color:'#7C3AED' },
              { icon:'📄', name:'Check', desc:'Physical check — 5-7 days', badge:'Traditional', color:'#64748B' },
            ].map(m => (
              <div key={m.name} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom:'1px solid #F8FAFC' }}>
                <span style={{ fontSize:'18px' }}>{m.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:'500', color:'#0F172A' }}>{m.name}</div>
                  <div style={{ fontSize:'11px', color:'#64748B' }}>{m.desc}</div>
                </div>
                <span style={{ fontSize:'10px', fontWeight:'700', padding:'2px 7px', borderRadius:'4px', background:`${m.color}15`, color:m.color }}>{m.badge}</span>
              </div>
            ))}
          </div>

          <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:'10px', padding:'20px' }}>
            <h3 style={{ fontSize:'14px', fontWeight:'600', color:'#0F172A', marginBottom:'14px' }}>Access Control</h3>
            {[
              { role:'OWNER', can:'View all · Pay vendors · Collect from customers · Run AR/AP reports', color:'#2563EB' },
              { role:'MANAGER', can:'View all · Pay vendors · Collect from customers', color:'#7C3AED' },
              { role:'CHEF', can:'View invoices only — no payment access', color:'#94A3B8' },
              { role:'STAFF', can:'No invoice access', color:'#CBD5E1' },
            ].map(r => (
              <div key={r.role} style={{ display:'flex', gap:'10px', padding:'8px 0', borderBottom:'1px solid #F8FAFC', alignItems:'flex-start' }}>
                <span style={{ fontSize:'10px', fontWeight:'700', padding:'3px 7px', borderRadius:'4px', background:`${r.color}15`, color:r.color, flexShrink:0, marginTop:'1px' }}>{r.role}</span>
                <span style={{ fontSize:'12px', color:'#64748B' }}>{r.can}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}