import axios from 'axios'

const api = axios.create({ baseURL: '/api', withCredentials: true })

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }
api.interceptors.response.use(null, (err) => {
  if (err.response?.status === 401 && !err.config.url.startsWith('/auth/')) onUnauthorized()
  return Promise.reject(err)
})

export const startCheck     = (usernames) => api.post('/check/start', { usernames })
export const getCheckStatus = (id)        => api.get(`/check/${id}`)

export const authMe       = ()                  => api.get('/auth/me')
export const authRegister = (email, password)   => api.post('/auth/register', { email, password })
export const authLogin    = (email, password)   => api.post('/auth/login', { email, password })
export const authLogout   = ()                  => api.post('/auth/logout')

export const fetchSnapshots = ()                => api.get('/snapshots')
export const postSnapshot   = (file_hash, data) => api.post('/snapshots', { file_hash, data })
export const fetchStatuses  = ()                => api.get('/statuses')
export const deleteHistory  = ()                => api.delete('/history')
export const putStatuses    = (statuses)        => api.put('/statuses', { statuses })
export const fetchDismissed = ()                => api.get('/dismissed')
export const putDismissed   = (keys)            => api.put('/dismissed', { keys })
export const removeDismissed = (keys)           => api.post('/dismissed/remove', { keys })

export default api
