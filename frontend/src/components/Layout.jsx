// src/components/Layout.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/',         icon: '▦', label: 'Dashboard'  },
  { to: '/invoices', icon: '◈', label: 'Invoices'   },
  { to: '/payments', icon: '◎', label: 'Payments'   },
]

export default function Layout({ children }) {
  const { user, tenant, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.brandMark}>⬡</span>
          <span style={styles.brandText}>PayFlow</span>
        </div>

        {/* Tenant badge */}
        <div style={styles.tenantBadge}>
          <div style={styles.tenantDot} />
          <div>
            <p style={styles.tenantName}>{tenant?.name}</p>
            <p style={styles.tenantPlan}>{tenant?.plan} plan</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to==='/'} style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {})
            })}>
              <span style={styles.navIcon}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={styles.userArea}>
          <div style={styles.avatar}>
            {user?.fullName?.charAt(0) || user?.full_name?.charAt(0) || 'U'}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <p style={styles.userName} className="truncate">
              {user?.fullName || user?.full_name}
            </p>
            <p style={styles.userRole}>{user?.role}</p>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn} title="Sign out">⇥</button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        {children}
      </main>
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    width: 220,
    minWidth: 220,
    background: 'var(--bg-card)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    paddingLeft: 4,
  },
  brandMark: { fontSize: 20, color: 'var(--accent)' },
  brandText: { fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em' },
  tenantBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--accent-dim)',
    border: '1px solid rgba(74,222,128,0.2)',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 24,
  },
  tenantDot: {
    width: 8, height: 8,
    borderRadius: '50%',
    background: 'var(--accent)',
    animation: 'pulse-glow 2s ease infinite',
    flexShrink: 0,
  },
  tenantName: { fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 },
  tenantPlan: { fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 8,
    color: 'var(--text-muted)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  navLinkActive: {
    background: 'var(--bg-hover)',
    color: 'var(--text)',
    borderLeft: '2px solid var(--accent)',
    paddingLeft: 10,
  },
  navIcon: { fontSize: 16, width: 18, textAlign: 'center' },
  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderTop: '1px solid var(--border)',
    paddingTop: 16,
    marginTop: 16,
  },
  avatar: {
    width: 32, height: 32,
    borderRadius: 8,
    background: 'var(--accent-dim)',
    border: '1px solid rgba(74,222,128,0.3)',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 600, color: 'var(--text)' },
  userRole: { fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 16,
    padding: 4,
    flexShrink: 0,
  },
  main: {
    flex: 1,
    overflow: 'auto',
    background: 'var(--bg)',
  }
}
