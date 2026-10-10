const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  })
  if (!res.ok) throw new Error(`API request failed (${res.status})`)
  return res.json()
}
export const api = {
  health: () => request('/api/health'),
  dashboard: () => request('/api/dashboard'),
  alerts: () => request('/api/alerts'),
  metrics: () => request('/api/metrics'),
  trends: () => request('/api/overview/trends'),
  actions: () => request('/api/actions'),
  addAction: (body) => request('/api/actions', { method: 'POST', body: JSON.stringify(body) }),
  leak: () => request('/api/demo/water-leak', { method: 'POST' }),
  energy: () => request('/api/demo/energy-anomaly', { method: 'POST' }),
  reset: () => request('/api/demo/reset', { method: 'POST' }),
}
