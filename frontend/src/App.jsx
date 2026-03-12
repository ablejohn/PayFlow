
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout     from './components/Layout'
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import Invoices   from './pages/Invoices'
import Payments   from './pages/Payments'
import InvoicePDF from './pages/InvoicePDF'

const Protected = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}>
      <span style={{ width:24,height:24,border:'2px solid #1e1e2e',borderTopColor:'#4ade80',borderRadius:'50%',display:'block',animation:'spin 0.8s linear infinite' }} />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Invoice PDF view — no sidebar, clean print layout */}
          <Route path="/invoices/:id/pdf" element={
            <Protected>
              <InvoicePDF />
            </Protected>
          } />
          <Route path="/*" element={
            <Protected>
              <Layout>
                <Routes>
                  <Route path="/"         element={<Dashboard />} />
                  <Route path="/invoices" element={<Invoices  />} />
                  <Route path="/payments" element={<Payments  />} />
                </Routes>
              </Layout>
            </Protected>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}