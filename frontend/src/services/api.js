// src/services/api.js
// Thin fetch wrapper — attaches JWT, handles errors globally

const BASE = '/api/v1'

const getToken = () => localStorage.getItem('pf_token')

const request = async (method, path, body = null) => {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json()

  if (!res.ok) {
    const err = new Error(data?.error?.message || 'Request failed')
    err.code = data?.error?.code
    err.status = res.status
    throw err
  }

  return data
}

export const api = {
  get:   (path)         => request('GET',    path),
  post:  (path, body)   => request('POST',   path, body),
  patch: (path, body)   => request('PATCH',  path, body),
  del:   (path)         => request('DELETE', path),
}

// ─── Auth ─────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  me:       ()     => api.get('/auth/me'),
}

// ─── Invoices ─────────────────────────────────────────────────────────────
export const invoiceApi = {
  list:         (params = {}) => api.get(`/invoices?${new URLSearchParams(params)}`),
  get:          (id)          => api.get(`/invoices/${id}`),
  create:       (data)        => api.post('/invoices', data),
  updateStatus: (id, status)  => api.patch(`/invoices/${id}/status`, { status }),
  generatePdf:  (id)          => api.post(`/invoices/${id}/pdf`),
}

// ─── Payments ─────────────────────────────────────────────────────────────
export const paymentApi = {
  list:         (params = {}) => api.get(`/payments?${new URLSearchParams(params)}`),
  create:       (data)        => api.post('/payments', data),
  updateStatus: (id, status, failureReason) =>
    api.patch(`/payments/${id}/status`, { status, failureReason }),
}
