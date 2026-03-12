
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { invoiceApi, paymentApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

const fmt = (n) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(n)
const fmtDate = (d) => new Date(d).toLocaleDateString('en-SE', { month: 'short', day: 'numeric' })

export default function Dashboard() {
  const { tenant } = useAuth()
  const navigate   = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      invoiceApi.list({ limit: 50 }),
      paymentApi.list(),
    ]).then(([inv, pay]) => {
      setInvoices(inv.data || [])
      setPayments(pay.data || [])
    }).finally(() => setLoading(false))
  }, [])

  // Stats
  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((s,p) => s + parseFloat(p.amount), 0)
  const pending      = invoices.filter(i => i.status === 'sent' || i.status === 'draft').length
  const paid         = invoices.filter(i => i.status === 'paid').length
  const overdue      = invoices.filter(i => i.status === 'overdue').length

  // Chart data — group invoices by date
  const chartData = invoices.slice(0, 10).reverse().map(inv => ({
    date:   fmtDate(inv.created_at),
    amount: parseFloat(inv.total_amount),
  }))

  if (loading) return <PageLoad />

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>
            Welcome back — <span style={{ color: 'var(--accent)' }}>{tenant?.name}</span>
          </p>
        </div>
        <button style={styles.ctaBtn} onClick={() => navigate('/invoices')}>
          + New Invoice
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <StatCard label="Total Revenue" value={fmt(totalRevenue)} accent="var(--accent)" icon="◈" />
        <StatCard label="Paid Invoices" value={paid}    accent="var(--accent)" icon="✓" />
        <StatCard label="Pending"       value={pending} accent="var(--yellow)"  icon="◷" />
        <StatCard label="Overdue"       value={overdue} accent="var(--red)"     icon="⚠" />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={styles.card} className="animate-up">
          <h3 style={styles.cardTitle}>Invoice Activity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4ade80" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#6b6b8a', fontSize: 11, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, fontFamily: 'Syne' }}
                labelStyle={{ color: '#6b6b8a', fontSize: 11 }}
                itemStyle={{ color: '#4ade80' }}
                formatter={(v) => [fmt(v), 'Amount']}
              />
              <Area type="monotone" dataKey="amount" stroke="#4ade80" strokeWidth={2} fill="url(#grad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent invoices */}
      <div style={styles.card} className="animate-up">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16 }}>
          <h3 style={styles.cardTitle}>Recent Invoices</h3>
          <button style={styles.linkBtn} onClick={() => navigate('/invoices')}>View all →</button>
        </div>
        {invoices.length === 0
          ? <Empty text="No invoices yet — create your first one" />
          : (
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Number','Customer','Amount','Status','Date'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0,6).map(inv => (
                  <tr key={inv.id} style={styles.tr} onClick={() => navigate('/invoices')}>
                    <td style={{...styles.td, fontFamily:'var(--mono)', fontSize:12}}>{inv.invoice_number}</td>
                    <td style={styles.td}>{inv.customer_name}</td>
                    <td style={{...styles.td, fontFamily:'var(--mono)'}}>{fmt(inv.total_amount)}</td>
                    <td style={styles.td}><StatusBadge status={inv.status} /></td>
                    <td style={{...styles.td, color:'var(--text-muted)', fontSize:12}}>{fmtDate(inv.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  )
}

const StatCard = ({ label, value, accent, icon }) => (
  <div style={{ ...styles.statCard }} className="animate-up">
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
      <p style={styles.statLabel}>{label}</p>
      <span style={{ fontSize: 18, color: accent, opacity: 0.8 }}>{icon}</span>
    </div>
    <p style={{ ...styles.statValue, color: accent }}>{value}</p>
  </div>
)

export const StatusBadge = ({ status }) => {
  const map = {
    draft:      { color:'var(--text-muted)',  bg:'rgba(107,107,138,0.12)' },
    sent:       { color:'var(--blue)',         bg:'var(--blue-dim)' },
    paid:       { color:'var(--accent)',       bg:'var(--accent-dim)' },
    overdue:    { color:'var(--red)',          bg:'var(--red-dim)' },
    cancelled:  { color:'var(--text-muted)',  bg:'rgba(107,107,138,0.12)' },
    pending:    { color:'var(--yellow)',       bg:'rgba(251,191,36,0.12)' },
    processing: { color:'var(--blue)',         bg:'var(--blue-dim)' },
    completed:  { color:'var(--accent)',       bg:'var(--accent-dim)' },
    failed:     { color:'var(--red)',          bg:'var(--red-dim)' },
    refunded:   { color:'var(--text-muted)',  bg:'rgba(107,107,138,0.12)' },
  }
  const c = map[status] || map.draft
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: '3px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      fontFamily: 'var(--mono)',
    }}>
      {status}
    </span>
  )
}

const Empty = ({ text }) => (
  <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign:'center', padding: '32px 0' }}>{text}</p>
)

const PageLoad = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
    <span className="spin" style={{ width:24,height:24,border:'2px solid var(--border)',borderTopColor:'var(--accent)',borderRadius:'50%',display:'block' }} />
  </div>
)

const styles = {
  page: { padding: 32, maxWidth: 1000, margin: '0 auto' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 32 },
  title: { fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'var(--text-muted)' },
  ctaBtn: {
    background: 'var(--accent)', color: '#0a0a0f',
    border: 'none', borderRadius: 8, padding: '10px 18px',
    fontFamily: 'var(--font)', fontWeight: 700, fontSize: 13,
    cursor: 'pointer',
  },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 },
  statCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '20px',
  },
  statLabel: { fontSize: 11, fontWeight: 600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom: 12 },
  statValue: { fontSize: 28, fontWeight: 800, letterSpacing:'-0.04em' },
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: 24, marginBottom: 20,
  },
  cardTitle: { fontSize: 14, fontWeight: 700, marginBottom: 16 },
  linkBtn: { background:'none', border:'none', color:'var(--accent)', fontSize:13, cursor:'pointer', fontFamily:'var(--font)', fontWeight:600 },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', paddingBottom:10, borderBottom:'1px solid var(--border)' },
  tr: { borderBottom:'1px solid var(--border)', cursor:'pointer' },
  td: { padding:'12px 0', paddingRight:16, fontSize:13, color:'var(--text)' },
}
