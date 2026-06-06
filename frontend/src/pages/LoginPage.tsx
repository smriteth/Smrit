import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/overview')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12">
        <img src="/smrit-logo.png" alt="SMRIT" className="w-28 h-28 object-contain mb-6" />
        <h1 className="text-4xl font-bold text-white mb-2 tracking-wide">SMRIT</h1>
        <p className="text-white/70 text-base text-center max-w-xs">Ethiopian Fleet Management System</p>
        <div className="mt-10 grid grid-cols-2 gap-3 w-full max-w-xs">
          {[['📍','Real-time GPS'],['🚛','Trip Management'],['💰','Driver Earnings'],['📊','Fleet Analytics']].map(([icon, label]) => (
            <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-white/80 text-xs">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/smrit-logo.png" alt="SMRIT" className="w-10 h-10 object-contain" />
            <div>
              <div className="font-bold text-primary text-xl">SMRIT</div>
              <div className="text-xs text-muted">Fleet Management</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-muted text-sm mb-8">Sign in to your fleet dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@smrit.et"
                required
                className="w-full px-4 py-3 rounded-lg border border-border bg-white text-foreground placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-border bg-white text-foreground placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors pr-16"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-primary font-medium">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 text-danger text-sm">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-60">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-neutral-50 rounded-lg border border-border text-xs text-muted">
            <span className="font-medium">Demo:</span> admin@smrit.et / smrit2026
          </div>
        </div>
      </div>
    </div>
  )
}
