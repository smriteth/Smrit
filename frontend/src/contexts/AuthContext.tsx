import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import apiClient from '@/lib/apiClient'

export interface SmritUser {
  userId: string
  accountId: string
  role: string
  email?: string
}

export interface AuthContextType {
  isAuthenticated: boolean
  user: SmritUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<SmritUser | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('smrit_token')
    const userData = localStorage.getItem('smrit_user')
    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
        setIsAuthenticated(true)
      } catch {
        localStorage.removeItem('smrit_token')
        localStorage.removeItem('smrit_user')
      }
    }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password })
    const { token, userId, accountId, role } = res.data
    const userData: SmritUser = { userId, accountId, role, email }
    localStorage.setItem('smrit_token', token)
    localStorage.setItem('smrit_user', JSON.stringify(userData))
    setUser(userData)
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem('smrit_token')
    localStorage.removeItem('smrit_user')
    setIsAuthenticated(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
