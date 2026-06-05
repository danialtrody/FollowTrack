import axios from 'axios'

// In production, set VITE_API_URL to your backend Render URL (no trailing slash).
// In development, Vite proxies /api to localhost:8000 so the fallback works.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' })

export const startCheck     = (usernames) => api.post('/check/start', { usernames })
export const getCheckStatus = (id)        => api.get(`/check/${id}`)
export const cancelCheck    = (id)        => api.delete(`/check/${id}`)

export default api
