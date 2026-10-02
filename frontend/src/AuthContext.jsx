import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import Splash from './components/Splash'
import { authMe, authLogin, authRegister, authLogout, setUnauthorizedHandler } from './api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
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
    try { await authLogout() } catch {}
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {user === undefined ? <Splash /> : children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
