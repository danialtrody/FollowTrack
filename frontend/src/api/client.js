import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const startCheck     = (usernames) => api.post('/check/start', { usernames })
export const getCheckStatus = (id)        => api.get(`/check/${id}`)
export const cancelCheck    = (id)        => api.delete(`/check/${id}`)

export default api
