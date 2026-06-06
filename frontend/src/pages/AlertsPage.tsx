import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import apiClient from '@/lib/apiClient'
import type { Alert } from '@/types/api'

import { AlertTriangle, Zap, Shield, Wrench, FileText, Clock, CheckCircle, Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const TYPE_ICONS: Record<string, any> = {
  SPEEDING: Zap,
  GEOFENCE_VIOLATION: Shield,
  MAINTENANCE_DUE: Wrench,
  LICENSE_EXPIRY: FileText,
  DOCUMENT_EXPIRY: FileText,
  IDLE: Clock,
}

const SEVERITY_BORDER: Record<string, string> = {
  HIGH: 'border-l-4 border-l-danger',
  MEDIUM: 'border-l-4 border-l-warning',
  LOW: 'border-l-4 border-l-blue-400',
}

export default function AlertsPage() {
  const qc = useQueryClient()
  const [severity, setSeverity] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const { data: alerts = [], isLoading } = useQuery<Alert[]>(
    ['alerts', severity, unreadOnly],
    () => apiClient.get(`/alerts?limit=100${severity ? `&severity=${severity}` : ''}${unreadOnly ? '&isRead=false' : ''}`).then(r => r.data),
    { refetchInterval: 30_000 }
  )

  const markRead = useMutation(
    (id: string) => apiClient.patch(`/alerts/${id}/read`),
    { onSuccess: () => { qc.invalidateQueries(['alerts']); qc.invalidateQueries('alert-count') } }
  )

  const markAllRead = useMutation(
    () => apiClient.patch('/alerts/read-all'),
    { onSuccess: () => { qc.invalidateQueries(['alerts']); qc.invalidateQueries('alert-count') } }
  )

  const unreadCount = alerts.filter(a => !a.isRead).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
          <p className="text-sm text-muted mt-0.5">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllRead.mutate()}
            className="px-4 py-2 border border-border bg-white rounded-lg text-sm text-foreground hover:bg-neutral-50 transition-colors">
            Mark All Read
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {(['', 'HIGH', 'MEDIUM', 'LOW'] as const).map(s => (
          <button key={s} onClick={() => setSeverity(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${severity === s ? 'bg-primary text-white' : 'bg-white border border-border text-foreground hover:bg-neutral-50'}`}>
            {s || 'All Severity'}
          </button>
        ))}
        <label className="flex items-center gap-2 text-sm cursor-pointer ml-2">
          <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)}
            className="rounded border-border text-primary" />
          Unread only
        </label>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="py-16 text-center">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
          <p className="text-foreground font-medium">All caught up!</p>
          <p className="text-muted text-sm mt-1">No alerts matching your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert: any) => {
            const Icon = TYPE_ICONS[alert.type] || Bell
            return (
              <div key={alert.id}
                className={`bg-white rounded-xl border border-border shadow-card p-4 ${SEVERITY_BORDER[alert.severity] || ''} ${!alert.isRead ? 'bg-blue-50/30' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${alert.severity === 'HIGH' ? 'bg-red-100' : alert.severity === 'MEDIUM' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                    <Icon size={16} className={alert.severity === 'HIGH' ? 'text-danger' : alert.severity === 'MEDIUM' ? 'text-warning' : 'text-blue-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!alert.isRead ? 'font-semibold text-foreground' : 'text-foreground'}`}>{alert.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {alert.truck && <span className="text-xs text-muted font-mono">{alert.truck.licensePlate}</span>}
                      {alert.driver && <span className="text-xs text-muted">{alert.driver.name}</span>}
                      <span className="text-xs text-muted">{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!alert.isRead && <span className="w-2 h-2 bg-primary rounded-full" />}
                    {!alert.isRead && (
                      <button onClick={() => markRead.mutate(alert.id)}
                        className="text-xs text-muted hover:text-primary font-medium transition-colors">
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
