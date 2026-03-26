import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(() => sessionStorage.getItem('accessToken'))
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async (tkn) => {
    if (!tkn) { setLoading(false); return }
    try {
      const res = await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${tkn}` }
      })
      setUser(res.data)
    } catch {
      setToken(null)
      sessionStorage.removeItem('accessToken')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMe(token) }, [token, fetchMe])

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password })
    const { accessToken, user: u } = res.data
    sessionStorage.setItem('accessToken', accessToken)
    setToken(accessToken)
    setUser(u)
    return u
  }

  const register = async (data) => {
    const res = await api.post('/api/auth/register', data)
    const { accessToken, user: u } = res.data
    sessionStorage.setItem('accessToken', accessToken)
    setToken(accessToken)
    setUser(u)
    return u
  }

  const logout = async () => {
    await api.post('/api/auth/logout').catch(() => {})
    sessionStorage.removeItem('accessToken')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// This hook is intentionally colocated with the provider for a small app context surface.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
