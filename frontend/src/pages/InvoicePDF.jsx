

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { invoiceApi } from '../services/api'

const fmt = (n, currency = 'SEK') =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-SE', { year: 'numeric', month: 'long', day: 'numeric' })

export default function InvoicePDF() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    invoiceApi.get(id)
      .then(res => setInvoice(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const handlePrint = () => window.print()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f5f5f0' }}>
      <p style={{ color:'#666', fontFamily:'Georgia, serif' }}>Loading invoice...</p>
    </div>
  )

  if (error || !invoice) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f5f5f0' }}>
      <p style={{ color:'#c00', fontFamily:'Georgia, serif' }}>Invoice not found</p>
    </div>
  )

  const statusColor = {
    paid:      '#16a34a',
    sent:      '#2563eb',
    draft:     '#9ca3af',
    overdue:   '#dc2626',
    cancelled: '#9ca3af',
  }[invoice.status] || '#9ca3af'

  return (
    <>
      {/* Print/download toolbar — hidden when printing */}
      <div className="no-print" style={toolbar.wrap}>
        <button onClick={() => navigate('/invoices')} style={toolbar.backBtn}>
          ← Back to Invoices
        </button>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <span style={{ fontSize:13, color:'#666' }}>
            {invoice.invoice_number} · {invoice.customer_name}
          </span>
          <button onClick={handlePrint} style={toolbar.printBtn}>
            ⬇ Download PDF
          </button>
        </div>
      </div>

      {/* Invoice document */}
      <div style={doc.page}>

        {/* Header band */}
        <div style={doc.headerBand}>
          <div>
            <div style={doc.companyName}>PayFlow</div>
            <div style={doc.companyTagline}>Invoice Management Platform</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={doc.invoiceLabel}>INVOICE</div>
            <div style={doc.invoiceNumber}>{invoice.invoice_number}</div>
          </div>
        </div>

        {/* Meta row */}
        <div style={doc.metaRow}>
          <div style={doc.metaBlock}>
            <div style={doc.metaLabel}>Bill To</div>
            <div style={doc.metaValue}>{invoice.customer_name}</div>
            <div style={doc.metaMuted}>{invoice.customer_email}</div>
          </div>
          <div style={doc.metaBlock}>
            <div style={doc.metaLabel}>Issue Date</div>
            <div style={doc.metaValue}>{fmtDate(invoice.created_at)}</div>
          </div>
          <div style={doc.metaBlock}>
            <div style={doc.metaLabel}>Due Date</div>
            <div style={doc.metaValue}>
              {invoice.due_date ? fmtDate(invoice.due_date) : 'Upon receipt'}
            </div>
          </div>
          <div style={doc.metaBlock}>
            <div style={doc.metaLabel}>Status</div>
            <div style={{ ...doc.statusBadge, background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}44` }}>
              {invoice.status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={doc.divider} />

        {/* Line items table */}
        <table style={doc.table}>
          <thead>
            <tr style={doc.tableHead}>
              <th style={{ ...doc.th, width:'50%', textAlign:'left' }}>Description</th>
              <th style={{ ...doc.th, textAlign:'center' }}>Qty</th>
              <th style={{ ...doc.th, textAlign:'right' }}>Unit Price</th>
              <th style={{ ...doc.th, textAlign:'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.line_items || []).map((item, i) => (
              <tr key={i} style={{ borderBottom:'1px solid #e8e8e0' }}>
                <td style={{ ...doc.td, fontWeight:500 }}>{item.description}</td>
                <td style={{ ...doc.td, textAlign:'center', color:'#555' }}>{item.qty}</td>
                <td style={{ ...doc.td, textAlign:'right', color:'#555', fontFamily:'monospace' }}>
                  {fmt(item.unit_price, invoice.currency)}
                </td>
                <td style={{ ...doc.td, textAlign:'right', fontWeight:600, fontFamily:'monospace' }}>
                  {fmt(item.qty * item.unit_price, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={doc.totalsWrap}>
          <div style={doc.totalsBox}>
            <div style={doc.totalRow}>
              <span style={doc.totalLabel}>Subtotal</span>
              <span style={doc.totalValue}>{fmt(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div style={doc.totalRow}>
              <span style={doc.totalLabel}>Tax ({invoice.tax_rate}%)</span>
              <span style={doc.totalValue}>{fmt(invoice.tax_amount, invoice.currency)}</span>
            </div>
            <div style={doc.divider} />
            <div style={{ ...doc.totalRow, ...doc.grandTotalRow }}>
              <span style={doc.grandTotalLabel}>Total Due</span>
              <span style={doc.grandTotalValue}>{fmt(invoice.total_amount, invoice.currency)}</span>
            </div>
            {invoice.status === 'paid' && (
              <div style={doc.paidStamp}>✓ PAID</div>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={doc.notes}>
            <div style={doc.metaLabel}>Notes</div>
            <p style={{ marginTop:6, color:'#555', fontSize:13, lineHeight:1.6 }}>{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={doc.footer}>
          <div>Thank you for your business.</div>
          <div style={{ color:'#aaa', marginTop:4 }}>
            Generated by PayFlow · {new Date().toLocaleDateString('en-SE')}
          </div>
        </div>

      </div>

      {/* Print-only styles injected via style tag */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          @page { margin: 0; size: A4; }
        }
      `}</style>
    </>
  )
}

// ─── Toolbar styles (screen only) ────────────────────────────────────────────
const toolbar = {
  wrap: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    background: '#1a1a2e',
    borderBottom: '1px solid #2a2a3e',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 32px',
    zIndex: 100,
    fontFamily: "'Syne', sans-serif",
  },
  backBtn: {
    background: 'none',
    border: '1px solid #2a2a3e',
    borderRadius: 8,
    color: '#aaa',
    padding: '8px 14px',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: "'Syne', sans-serif",
  },
  printBtn: {
    background: '#4ade80',
    border: 'none',
    borderRadius: 8,
    color: '#0a0a0f',
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Syne', sans-serif",
  },
}

// ─── Invoice document styles ──────────────────────────────────────────────────
const doc = {
  page: {
    maxWidth: 800,
    margin: '80px auto 60px',
    background: '#ffffff',
    borderRadius: 4,
    boxShadow: '0 4px 40px rgba(0,0,0,0.12)',
    padding: '56px 64px',
    fontFamily: 'Georgia, "Times New Roman", serif',
    color: '#111',
    minHeight: '1050px',
    position: 'relative',
  },
  headerBand: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 48,
    paddingBottom: 32,
    borderBottom: '3px solid #111',
  },
  companyName: {
    fontSize: 32,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    fontFamily: "'Syne', Georgia, sans-serif",
    color: '#111',
  },
  companyTagline: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontFamily: "'Syne', sans-serif",
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  invoiceLabel: {
    fontSize: 11,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: '#888',
    fontFamily: "'Syne', sans-serif",
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 22,
    fontWeight: 700,
    fontFamily: 'monospace',
    color: '#111',
  },
  metaRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    gap: 24,
    marginBottom: 40,
  },
  metaBlock: {},
  metaLabel: {
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#888',
    fontFamily: "'Syne', sans-serif",
    marginBottom: 6,
    fontWeight: 600,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111',
    lineHeight: 1.4,
  },
  metaMuted: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: 'monospace',
    letterSpacing: '0.08em',
    marginTop: 2,
  },
  divider: {
    height: 1,
    background: '#e8e8e0',
    margin: '24px 0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: 0,
  },
  tableHead: {
    background: '#f8f8f4',
    borderTop: '2px solid #111',
    borderBottom: '2px solid #111',
  },
  th: {
    padding: '12px 8px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#333',
    fontFamily: "'Syne', sans-serif",
  },
  td: {
    padding: '14px 8px',
    fontSize: 13,
    color: '#222',
    lineHeight: 1.4,
  },
  totalsWrap: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 40,
  },
  totalsBox: {
    width: 300,
    borderTop: '2px solid #111',
    paddingTop: 16,
    position: 'relative',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
  },
  totalLabel: {
    fontSize: 13,
    color: '#555',
    fontFamily: "'Syne', sans-serif",
  },
  totalValue: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'monospace',
  },
  grandTotalRow: {
    paddingTop: 10,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 700,
    color: '#111',
    fontFamily: "'Syne', sans-serif",
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111',
    fontFamily: 'monospace',
  },
  paidStamp: {
    position: 'absolute',
    top: -10,
    right: -20,
    fontSize: 36,
    fontWeight: 900,
    color: 'rgba(22, 163, 74, 0.15)',
    border: '4px solid rgba(22, 163, 74, 0.2)',
    borderRadius: 8,
    padding: '4px 12px',
    transform: 'rotate(-12deg)',
    letterSpacing: '0.1em',
    fontFamily: "'Syne', sans-serif",
    pointerEvents: 'none',
  },
  notes: {
    background: '#f8f8f4',
    borderRadius: 6,
    padding: '16px 20px',
    marginBottom: 40,
  },
  footer: {
    borderTop: '1px solid #e8e8e0',
    paddingTop: 24,
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    fontFamily: "'Syne', sans-serif",
  },
}