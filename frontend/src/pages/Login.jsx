
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [mode, setMode]     = useState('login') // 'login' | 'register'
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    tenantName: '', tenantSlug: '', fullName: '',
    email: '', password: ''
  })

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (k === 'tenantName') {
      setForm(f => ({
        ...f,
        tenantName: e.target.value,
        tenantSlug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }))
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password })
      } else {
        const res = await authApi.register(form)
        localStorage.setItem('pf_token', res.data.token)
        window.location.reload()
      }
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrap}>
      {/* Background grid */}
      <div style={styles.grid} />

      <div style={styles.card} className="animate-up">
        {/* Logo */}
        <div style={styles.logo}>
          <span style={styles.logoMark}>⬡</span>
          <span style={styles.logoText}>PayFlow</span>
        </div>

        <p style={styles.sub}>
          {mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace'}
        </p>

        {/* Tab toggle */}
        <div style={styles.tabs}>
          {['login','register'].map(t => (
            <button key={t} style={{...styles.tab, ...(mode===t ? styles.tabActive : {})}}
              onClick={() => { setMode(t); setError('') }}>
              {t === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={styles.form}>
          {mode === 'register' && (
            <>
              <Field label="Company name" value={form.tenantName} onChange={set('tenantName')} placeholder="Acme AB" />
              <Field label="Workspace slug" value={form.tenantSlug} onChange={set('tenantSlug')} placeholder="acme-ab" mono />
              <Field label="Your full name" value={form.fullName} onChange={set('fullName')} placeholder="John Abe" />
            </>
          )}
          <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="john@company.se" />
          <Field label="Password" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading
              ? <span className="spin" style={styles.spinner} />
              : mode === 'login' ? 'Sign in →' : 'Create workspace →'
            }
          </button>
        </form>
      </div>

      <p style={styles.footer}>
        Multi-tenant · JWT auth · PostgreSQL · AWS S3
      </p>
    </div>
  )
}

const Field = ({ label, value, onChange, placeholder, type='text', mono=false }) => (
  <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
    <label style={styles.label}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required
      style={{ ...styles.input, ...(mono ? { fontFamily: 'var(--mono)', fontSize: 13 } : {}) }}
    />
  </div>
)

const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  grid: {
    position: 'fixed',
    inset: 0,
    backgroundImage: `
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px',
    opacity: 0.4,
    pointerEvents: 'none',
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-lit)',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    position: 'relative',
    zIndex: 1,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  logoMark: {
    fontSize: 28,
    color: 'var(--accent)',
    lineHeight: 1,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: 'var(--text)',
  },
  sub: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginBottom: 28,
  },
  tabs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 4,
    background: 'var(--bg)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    padding: '8px 0',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font)',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'var(--bg-card)',
    color: 'var(--text)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 14px',
    color: 'var(--text)',
    fontFamily: 'var(--font)',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    background: 'var(--red-dim)',
    border: '1px solid var(--red)',
    borderRadius: 8,
    padding: '10px 14px',
    color: 'var(--red)',
    fontSize: 13,
  },
  btn: {
    background: 'var(--accent)',
    color: '#0a0a0f',
    border: 'none',
    borderRadius: 8,
    padding: '12px 0',
    fontFamily: 'var(--font)',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'opacity 0.2s',
  },
  spinner: {
    width: 16, height: 16,
    border: '2px solid rgba(0,0,0,0.2)',
    borderTopColor: '#0a0a0f',
    borderRadius: '50%',
    display: 'inline-block',
  },
  footer: {
    marginTop: 32,
    fontSize: 11,
    color: 'var(--text-dim)',
    fontFamily: 'var(--mono)',
    letterSpacing: '0.04em',
    position: 'relative',
    zIndex: 1,
  }
}
