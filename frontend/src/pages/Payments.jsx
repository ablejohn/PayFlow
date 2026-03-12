import { useState, useEffect } from 'react'
import { paymentApi, invoiceApi } from '../services/api'
import { StatusBadge } from './Dashboard'

const fmt = (n, currency = 'SEK') => new Intl.NumberFormat('sv-SE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
const fmtDate = (d) => new Date(d).toLocaleDateString('en-SE', { month: 'short', day: 'numeric', year: 'numeric' })

export default function Payments() {
  const [payments,  setPayments]  = useState([])
  const [invoices,  setInvoices]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([paymentApi.list(), invoiceApi.list({ limit: 100 })])
      .then(([pay, inv]) => {
        setPayments(pay.data || [])
        setInvoices((inv.data || []).filter(i => i.status !== 'paid' && i.status !== 'cancelled'))
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const advance = async (paymentId, currentStatus) => {
    const next = { pending: 'processing', processing: 'completed' }[currentStatus]
    if (!next) return
    setUpdatingId(paymentId)
    try {
      await paymentApi.updateStatus(paymentId, next)
      load()
    } finally {
      setUpdatingId(null)
    }
  }

  const totalPaid = payments.filter(p => p.status === 'completed').reduce((s,p) => s + parseFloat(p.amount), 0)

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Payments</h1>
          <p style={styles.sub}>{payments.length} total · {payments.filter(p=>p.status==='completed').length} payments collected</p>
        </div>
        <button style={styles.ctaBtn} onClick={() => setShowForm(true)}>+ Record Payment</button>
      </div>

      <div style={styles.card}>
        {loading
          ? <p style={styles.muted}>Loading...</p>
          : payments.length === 0
          ? <p style={styles.muted}>No payments yet</p>
          : (
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Amount','Provider','Status','Created','Actions'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(pay => (
                  <tr key={pay.id} style={styles.tr}>
                    <td style={{...styles.td, fontFamily:'var(--mono)', fontWeight:700, color:'var(--accent)'}}>{fmt(pay.amount, pay.currency)}</td>
                    <td style={{...styles.td, fontFamily:'var(--mono)', fontSize:12, textTransform:'uppercase'}}>{pay.provider}</td>
                    <td style={styles.td}><StatusBadge status={pay.status} /></td>
                    <td style={{...styles.td, fontSize:12, color:'var(--text-muted)'}}>{fmtDate(pay.created_at)}</td>
                    <td style={styles.td}>
                      {['pending','processing'].includes(pay.status) && (
                        <button
                          onClick={() => advance(pay.id, pay.status)}
                          disabled={updatingId === pay.id}
                          style={styles.advanceBtn}>
                          {updatingId === pay.id ? '...' : pay.status === 'pending' ? 'Process →' : 'Complete →'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>

      {showForm && (
        <CreatePaymentModal
          invoices={invoices}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function CreatePaymentModal({ invoices, onClose, onCreated }) {
  const [invoiceId, setInvoiceId] = useState('')
  const [provider,  setProvider]  = useState('stripe')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await paymentApi.create({ invoiceId, provider })
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()} className="animate-up">
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24 }}>
          <h2 style={{ fontSize:18,fontWeight:800 }}>Record Payment</h2>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--text-muted)',fontSize:20,cursor:'pointer' }}>✕</button>
        </div>

        {invoices.length === 0
          ? <p style={styles.muted}>No unpaid invoices to record a payment for.</p>
          : (
            <form onSubmit={submit} style={{ display:'flex',flexDirection:'column',gap:16 }}>
              <div>
                <label style={styles.label}>Invoice</label>
                <select value={invoiceId} onChange={e => setInvoiceId(e.target.value)} required style={styles.input}>
                  <option value="">Select invoice...</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {inv.customer_name} ({inv.total_amount} {inv.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Payment Provider</label>
                <select value={provider} onChange={e => setProvider(e.target.value)} style={styles.input}>
                  <option value="stripe">Stripe</option>
                  <option value="klarna">Klarna</option>
                  <option value="swish">Swish</option>
                </select>
              </div>

              {error && <p style={{ color:'var(--red)',fontSize:13 }}>{error}</p>}

              <button type="submit" style={styles.ctaBtn} disabled={loading}>
                {loading ? 'Creating...' : 'Record Payment →'}
              </button>
            </form>
          )
        }
      </div>
    </div>
  )
}

const styles = {
  page: { padding:32,maxWidth:1100,margin:'0 auto' },
  header: { display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24 },
  title: { fontSize:26,fontWeight:800,letterSpacing:'-0.03em',marginBottom:4 },
  sub: { fontSize:13,color:'var(--text-muted)' },
  ctaBtn: { background:'var(--accent)',color:'#0a0a0f',border:'none',borderRadius:8,padding:'10px 18px',fontFamily:'var(--font)',fontWeight:700,fontSize:13,cursor:'pointer' },
  card: { background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:24 },
  muted: { color:'var(--text-muted)',fontSize:13,textAlign:'center',padding:'32px 0' },
  table: { width:'100%',borderCollapse:'collapse' },
  th: { textAlign:'left',fontSize:11,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',paddingBottom:12,borderBottom:'1px solid var(--border)' },
  tr: { borderBottom:'1px solid var(--border)' },
  td: { padding:'14px 16px 14px 0',fontSize:13,color:'var(--text)',verticalAlign:'middle' },
  advanceBtn: { background:'var(--blue-dim)',border:'1px solid var(--blue)',color:'var(--blue)',borderRadius:6,padding:'5px 12px',fontSize:12,fontFamily:'var(--font)',fontWeight:600,cursor:'pointer' },
  overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:24 },
  modal: { background:'var(--bg-card)',border:'1px solid var(--border-lit)',borderRadius:16,padding:28,width:'100%',maxWidth:440 },
  label: { fontSize:11,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:6 },
  input: { background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px',color:'var(--text)',fontFamily:'var(--font)',fontSize:13,outline:'none',width:'100%' },
}