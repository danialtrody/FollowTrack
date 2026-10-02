import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authMe, authLogin, authRegister, authLogout, setUnauthorizedHandler } from './api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = still checking the session, null = signed out
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    authMe().then(r => setUser(r.data)).catch(() => setUser(null))
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await authLogin(email, password)
    setUser(data)
  }, [])

  const register = useCallback(async (email, password) => {
    const { data } = await authRegister(email, password)
    setUser(data)
  }, [])

  const logout = useCallback(async () => {
    try { await authLogout() } catch { /* cookie expires on its own */ }
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {user === undefined ? null : children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
