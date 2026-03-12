// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user,   setUser]   = useState(null)
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('pf_token')
    if (token) {
      authApi.me()
        .then(res => { setUser(res.data.user); setTenant(res.data.tenant) })
        .catch(() => localStorage.removeItem('pf_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (credentials) => {
    const res = await authApi.login(credentials)
    localStorage.setItem('pf_token', res.data.token)
    setUser(res.data.user)
    setTenant(res.data.tenant)
    return res
  }

  const logout = () => {
    localStorage.removeItem('pf_token')
    setUser(null)
    setTenant(null)
  }

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
