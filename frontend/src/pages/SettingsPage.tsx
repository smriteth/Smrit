import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiBaseUrl, isUsingFallbackApi } from '@/lib/config'

export default function SettingsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'account' | 'notifications'>('account')
  const [notifications, setNotifications] = useState({
    maintenance: true,
    licenseExpiry: true,
    speeding: true,
    geofenceViolation: true,
    idle: false,
  })
  const [saved, setSaved] = useState(false)

  const saveNotifications = () => {
    localStorage.setItem('smrit_notifications', JSON.stringify(notifications))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted mt-0.5">Manage your account preferences</p>
      </div>

      <div className="flex border-b border-border">
        {(['account', 'notifications'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'account' && (
        <div className="bg-white rounded-xl border border-border shadow-card p-6 space-y-5">
          <h2 className="font-semibold text-foreground">Account Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">User ID</label>
              <p className="text-sm text-foreground font-mono bg-neutral-50 rounded px-3 py-2 border border-border">{user?.userId || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">Account ID</label>
              <p className="text-sm text-foreground font-mono bg-neutral-50 rounded px-3 py-2 border border-border">{user?.accountId || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">Email</label>
              <p className="text-sm text-foreground bg-neutral-50 rounded px-3 py-2 border border-border">{user?.email || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">Role</label>
              <p className="text-sm text-foreground bg-neutral-50 rounded px-3 py-2 border border-border capitalize">{user?.role?.replace('_', ' ') || '—'}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-border">
            <h3 className="font-medium text-sm text-foreground mb-2">API Information</h3>
            <p className="text-xs text-muted">
              Backend: <span className="font-mono">{apiBaseUrl}</span>
              {isUsingFallbackApi && (
                <span className="ml-2 text-amber-500 font-medium">(localhost fallback — set VITE_API_URL for production)</span>
              )}
            </p>
            <p className="text-xs text-muted mt-1">GPS tracking powered by SMRIT</p>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="bg-white rounded-xl border border-border shadow-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Alert Notifications</h2>
          <p className="text-xs text-muted">Configure which alerts are enabled. Changes are saved locally.</p>
          <div className="space-y-3">
            {[
              { key: 'maintenance', label: 'Maintenance reminders', desc: 'Alert when service is due within 30 days' },
              { key: 'licenseExpiry', label: 'License expiry warnings', desc: 'Alert when driver license expires within 30 days' },
              { key: 'speeding', label: 'Speeding alerts', desc: 'Alert when vehicle exceeds 110 km/h' },
              { key: 'geofenceViolation', label: 'Geofence violations', desc: 'Alert when vehicles enter or exit defined zones' },
              { key: 'idle', label: 'Idle engine alerts', desc: 'Alert when engine is idle for extended periods' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => setNotifications(p => ({ ...p, [item.key]: !(p as any)[item.key] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${(notifications as any)[item.key] ? 'bg-primary' : 'bg-neutral-200'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${(notifications as any)[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={saveNotifications}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-dark'}`}>
            {saved ? '✓ Saved!' : 'Save Preferences'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <img src="/smrit-logo.png" alt="SMRIT" className="w-10 h-10 object-contain" />
          <div>
            <p className="font-bold text-foreground">SMRIT Fleet Management</p>
            <p className="text-xs text-muted">Ethiopian Fleet Management System</p>
          </div>
        </div>
        <p className="text-xs text-muted">Version 1.0.0 — Built for Ethiopian fleet operators</p>
        <p className="text-xs text-muted mt-0.5">GPS tracking powered by SMRIT</p>
      </div>
    </div>
  )
}
