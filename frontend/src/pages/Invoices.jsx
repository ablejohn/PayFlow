
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoiceApi, paymentApi } from '../services/api'
import { StatusBadge } from './Dashboard'

const fmt = (n, currency = 'SEK') => new Intl.NumberFormat('sv-SE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
const fmtDate = (d) => new Date(d).toLocaleDateString('en-SE', { month: 'short', day: 'numeric', year: 'numeric' })

export default function Invoices() {
  const [invoices,    setInvoices]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [filter,      setFilter]      = useState('all')
  const [actioningId, setActioningId] = useState(null)
  const [toast,       setToast]       = useState(null)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    invoiceApi.list({ limit: 50 })
      .then(res => setInvoices(res.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const markSent = async (inv) => {
    setActioningId(inv.id)
    try {
      await invoiceApi.updateStatus(inv.id, 'sent')
      showToast(`${inv.invoice_number} marked as sent ✓`)
      load()
    } finally { setActioningId(null) }
  }

  // One-click pay: create payment → process → complete (auto-marks invoice paid)
  const quickPay = async (inv) => {
    setActioningId(inv.id)
    try {
      const payRes = await paymentApi.create({ invoiceId: inv.id, provider: 'stripe' })
      const payId  = payRes.data.id
      await paymentApi.updateStatus(payId, 'processing')
      await paymentApi.updateStatus(payId, 'completed')
      showToast(`${inv.invoice_number} marked as paid ✓`)
      load()
    } catch (err) {
      showToast(`Error: ${err.message}`)
    } finally { setActioningId(null) }
  }

  const markOverdue = async (inv) => {
    setActioningId(inv.id)
    try {
      await invoiceApi.updateStatus(inv.id, 'overdue')
      showToast(`${inv.invoice_number} marked as overdue`)
      load()
    } finally { setActioningId(null) }
  }

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)

  const getActions = (inv) => {
    if (actioningId === inv.id) return <span style={styles.actionBusy}>Working...</span>
    switch (inv.status) {
      case 'draft':
        return (
          <div style={styles.actionGroup}>
            <ActionBtn label="Mark Sent"  color="var(--blue)"   onClick={() => markSent(inv)} />
            <ActionBtn label="Mark Paid"  color="var(--accent)" onClick={() => quickPay(inv)} />
          </div>
        )
      case 'sent':
        return (
          <div style={styles.actionGroup}>
            <ActionBtn label="Mark Paid"    color="var(--accent)" onClick={() => quickPay(inv)} />
            <ActionBtn label="Mark Overdue" color="var(--red)"    onClick={() => markOverdue(inv)} />
          </div>
        )
      case 'overdue':
        return <ActionBtn label="Mark Paid" color="var(--accent)" onClick={() => quickPay(inv)} />
      case 'paid':
        return <span style={{ fontSize:12, color:'var(--accent)', fontFamily:'var(--mono)' }}>✓ Completed</span>
      default:
        return <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>
    }
  }

  return (
    <div style={styles.page}>
      {toast && <div style={styles.toast} className="animate-up">{toast}</div>}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Invoices</h1>
          <p style={styles.sub}>
            {invoices.length} total ·{' '}
            <span style={{ color:'var(--accent)' }}>{invoices.filter(i=>i.status==='paid').length} paid</span> ·{' '}
            <span style={{ color:'var(--yellow)' }}>{invoices.filter(i=>i.status==='sent'||i.status==='draft').length} outstanding</span> ·{' '}
            <span style={{ color:'var(--red)' }}>{invoices.filter(i=>i.status==='overdue').length} overdue</span>
          </p>
        </div>
        <button style={styles.ctaBtn} onClick={() => setShowForm(true)}>+ Create Invoice</button>
      </div>

      {/* Filter tabs */}
      <div style={styles.filters}>
        {['all','draft','sent','paid','overdue','cancelled'].map(f => (
          <button key={f}
            style={{ ...styles.filterBtn, ...(filter===f ? styles.filterActive : {}) }}
            onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <span style={styles.filterCount}>{invoices.filter(i => i.status === f).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={styles.card}>
        {loading
          ? <p style={styles.muted}>Loading...</p>
          : filtered.length === 0
          ? <p style={styles.muted}>No invoices found</p>
          : (
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Invoice #','Customer','Amount','Status','Due Date','Created','Actions'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} style={styles.tr}>
                    <td style={{...styles.td, fontFamily:'var(--mono)', fontSize:12, color:'var(--accent)'}}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {inv.invoice_number}
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}/pdf`)}
                          title="View / Download PDF"
                          style={{ background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.3)', borderRadius:5, color:'var(--accent)', fontSize:10, padding:'2px 7px', cursor:'pointer', fontFamily:'var(--font)', fontWeight:700, whiteSpace:'nowrap' }}>
                          PDF ↗
                        </button>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight:600 }}>{inv.customer_name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{inv.customer_email}</div>
                    </td>
                    <td style={{...styles.td, fontFamily:'var(--mono)', fontWeight:700}}>
                      {fmt(inv.total_amount, inv.currency)}
                    </td>
                    <td style={styles.td}><StatusBadge status={inv.status} /></td>
                    <td style={{...styles.td, fontSize:12, color:'var(--text-muted)'}}>
                      {inv.due_date ? fmtDate(inv.due_date) : '—'}
                    </td>
                    <td style={{...styles.td, fontSize:12, color:'var(--text-muted)'}}>
                      {fmtDate(inv.created_at)}
                    </td>
                    <td style={styles.td}>{getActions(inv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>

      {/* Flow legend */}
      <div style={styles.flowGuide}>
        <span style={styles.flowTitle}>Flow:</span>
        <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>Draft</span>
        <span style={{ fontSize:12, color:'var(--border-lit)' }}>→</span>
        <span style={{ fontSize:12, color:'var(--blue)', fontFamily:'var(--mono)' }}>Sent</span>
        <span style={{ fontSize:12, color:'var(--border-lit)' }}>→</span>
        <span style={{ fontSize:12, color:'var(--accent)', fontFamily:'var(--mono)' }}>Paid ✓</span>
        <span style={{ fontSize:12, color:'var(--border-lit)', marginLeft:8 }}>or</span>
        <span style={{ fontSize:12, color:'var(--red)', fontFamily:'var(--mono)', marginLeft:8 }}>Overdue → Paid ✓</span>
      </div>

      {showForm && (
        <CreateInvoiceModal
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); showToast('Invoice created ✓') }}
        />
      )}
    </div>
  )
}

const ActionBtn = ({ label, color, onClick }) => (
  <button onClick={onClick} style={{
    background: 'transparent', border: `1px solid ${color}`,
    borderRadius: 6, color, padding: '4px 10px',
    fontSize: 11, fontFamily: 'var(--font)', fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap',
  }}>
    {label}
  </button>
)

function CreateInvoiceModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ customerName:'', customerEmail:'', taxRate:25, currency:'SEK', notes:'' })
  const [lineItems, setLineItems] = useState([{ description:'', qty:1, unit_price:0 }])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setLine = (i, k) => (e) => {
    const updated = [...lineItems]
    updated[i] = { ...updated[i], [k]: k === 'description' ? e.target.value : parseFloat(e.target.value) || 0 }
    setLineItems(updated)
  }
  const addLine    = () => setLineItems(l => [...l, { description:'', qty:1, unit_price:0 }])
  const removeLine = (i) => setLineItems(l => l.filter((_, idx) => idx !== i))

  const subtotal = lineItems.reduce((s, l) => s + l.qty * l.unit_price, 0)
  const tax      = subtotal * (parseFloat(form.taxRate) / 100)
  const total    = subtotal + tax

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await invoiceApi.create({ ...form, taxRate: parseFloat(form.taxRate), lineItems })
      onCreated()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()} className="animate-up">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ fontSize:18, fontWeight:800 }}>New Invoice</h2>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--text-muted)',fontSize:20,cursor:'pointer' }}>✕</button>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={styles.row}>
            <Field label="Customer Name"  value={form.customerName}  onChange={setF('customerName')}  placeholder="Acme AB" />
            <Field label="Customer Email" value={form.customerEmail} onChange={setF('customerEmail')} placeholder="billing@acme.se" type="email" />
          </div>
          <div>
            <label style={styles.label}>Line Items</label>
            {lineItems.map((line, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 80px 100px 32px', gap:8, marginTop:8 }}>
                <input style={styles.input} placeholder="Description" value={line.description} onChange={setLine(i,'description')} required />
                <input style={styles.input} type="number" placeholder="Qty"   value={line.qty}        onChange={setLine(i,'qty')}        min="0.01" step="0.01" />
                <input style={styles.input} type="number" placeholder="Price" value={line.unit_price} onChange={setLine(i,'unit_price')} min="0"    step="0.01" />
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLine(i)}
                    style={{ background:'var(--red-dim)',border:'1px solid var(--red)',borderRadius:6,color:'var(--red)',cursor:'pointer',fontSize:12 }}>✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addLine}
              style={{ marginTop:8,background:'none',border:'1px dashed var(--border-lit)',borderRadius:6,color:'var(--text-muted)',padding:'6px 12px',cursor:'pointer',fontSize:12,fontFamily:'var(--font)' }}>
              + Add line
            </button>
          </div>
          <div style={styles.row}>
            <Field label="Tax Rate (%)" value={form.taxRate} onChange={setF('taxRate')} type="number" placeholder="25" />
            <div>
              <label style={styles.label}>Currency</label>
              <select value={form.currency} onChange={setF('currency')} style={styles.input}>
                {['SEK','EUR','USD','GBP'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ background:'var(--bg)',borderRadius:8,padding:'12px 16px',fontFamily:'var(--mono)',fontSize:12 }}>
            <div style={{ display:'flex',justifyContent:'space-between',color:'var(--text-muted)',marginBottom:4 }}>
              <span>Subtotal</span><span>{fmt(subtotal, form.currency)}</span>
            </div>
            <div style={{ display:'flex',justifyContent:'space-between',color:'var(--text-muted)',marginBottom:6 }}>
              <span>Tax ({form.taxRate}%)</span><span>{fmt(tax, form.currency)}</span>
            </div>
            <div style={{ display:'flex',justifyContent:'space-between',color:'var(--accent)',fontWeight:700,borderTop:'1px solid var(--border)',paddingTop:6 }}>
              <span>Total</span><span>{fmt(total, form.currency)}</span>
            </div>
          </div>
          {error && <p style={{ color:'var(--red)',fontSize:13,background:'var(--red-dim)',padding:'10px 14px',borderRadius:8 }}>{error}</p>}
          <button type="submit" style={styles.ctaBtn} disabled={loading}>
            {loading ? 'Creating...' : 'Create Invoice →'}
          </button>
        </form>
      </div>
    </div>
  )
}

const Field = ({ label, value, onChange, placeholder, type='text' }) => (
  <div style={{ display:'flex',flexDirection:'column',gap:6,flex:1 }}>
    <label style={styles.label}>{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} required style={styles.input} />
  </div>
)

const styles = {
  page:        { padding:32, maxWidth:1200, margin:'0 auto', position:'relative' },
  header:      { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 },
  title:       { fontSize:26, fontWeight:800, letterSpacing:'-0.03em', marginBottom:4 },
  sub:         { fontSize:13, color:'var(--text-muted)' },
  ctaBtn:      { background:'var(--accent)', color:'#0a0a0f', border:'none', borderRadius:8, padding:'10px 18px', fontFamily:'var(--font)', fontWeight:700, fontSize:13, cursor:'pointer' },
  filters:     { display:'flex', gap:4, marginBottom:20, flexWrap:'wrap' },
  filterBtn:   { background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', color:'var(--text-muted)', fontFamily:'var(--font)', fontWeight:600, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6 },
  filterActive:{ background:'var(--bg-card)', color:'var(--text)', borderColor:'var(--border-lit)' },
  filterCount: { background:'var(--border-lit)', borderRadius:4, padding:'1px 5px', fontSize:10, color:'var(--text-muted)' },
  card:        { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:24 },
  muted:       { color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'32px 0' },
  table:       { width:'100%', borderCollapse:'collapse' },
  th:          { textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', paddingBottom:12, borderBottom:'1px solid var(--border)', paddingRight:12 },
  tr:          { borderBottom:'1px solid var(--border)' },
  td:          { padding:'13px 12px 13px 0', fontSize:13, color:'var(--text)', verticalAlign:'middle' },
  actionGroup: { display:'flex', gap:6, flexWrap:'wrap' },
  actionBusy:  { fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)' },
  overlay:     { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:24 },
  modal:       { background:'var(--bg-card)', border:'1px solid var(--border-lit)', borderRadius:16, padding:28, width:'100%', maxWidth:580, maxHeight:'90vh', overflowY:'auto' },
  row:         { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  label:       { fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' },
  input:       { background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', color:'var(--text)', fontFamily:'var(--font)', fontSize:13, outline:'none', width:'100%' },
  flowGuide:   { display:'flex', alignItems:'center', gap:8, marginTop:16, padding:'10px 16px', background:'var(--bg-card)', borderRadius:8, border:'1px solid var(--border)', flexWrap:'wrap' },
  flowTitle:   { fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' },
  toast:       { position:'fixed', bottom:32, right:32, background:'var(--accent)', color:'#0a0a0f', padding:'12px 20px', borderRadius:10, fontWeight:700, fontSize:13, zIndex:999, boxShadow:'0 4px 20px rgba(74,222,128,0.3)' },
}