import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import apiClient from '@/lib/apiClient'
import { Plus, Wrench, AlertTriangle } from 'lucide-react'
import { format, isAfter, isBefore, addDays } from 'date-fns'

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { SCHEDULED: 'bg-blue-100 text-blue-800', COMPLETED: 'bg-green-100 text-green-800', OVERDUE: 'bg-red-100 text-red-800' }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

const TYPES = ['OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_SERVICE', 'FULL_SERVICE', 'OTHER']

export default function MaintenancePage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ truckId: '', type: 'OIL_CHANGE', scheduledAt: '', costEtb: '', mileageKm: '', notes: '' })

  const { data: records = [], isLoading } = useQuery('maintenance',
    () => apiClient.get('/maintenance').then(r => r.data),
    { refetchInterval: 120_000 }
  )
  const { data: trucks = [] } = useQuery('devices-list', () => apiClient.get('/devices').then(r => r.data))

  const addRecord = useMutation(
    (data: any) => apiClient.post('/maintenance', data),
    { onSuccess: () => { qc.invalidateQueries('maintenance'); setShowAdd(false) } }
  )

  const completeRecord = useMutation(
    (id: string) => apiClient.patch(`/maintenance/${id}`, { status: 'COMPLETED', completedAt: new Date().toISOString() }),
    { onSuccess: () => qc.invalidateQueries('maintenance') }
  )

  const now = new Date()
  const overdue = (records as any[]).filter(r => r.status === 'OVERDUE')
  const dueSoon = (records as any[]).filter(r => r.status === 'SCHEDULED' && isBefore(new Date(r.scheduledAt), addDays(now, 30)))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maintenance</h1>
          <p className="text-sm text-muted mt-0.5">{(records as any[]).length} records</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
          <Plus size={16} /> Log Maintenance
        </button>
      </div>

      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-danger mb-2 flex items-center gap-2"><AlertTriangle size={14} /> Overdue ({overdue.length})</h3>
          <div className="space-y-1">
            {overdue.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{r.truck?.licensePlate} — {r.type.replace(/_/g, ' ')}</span>
                <button onClick={() => completeRecord.mutate(r.id)} className="text-xs text-primary hover:underline">Mark Complete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {dueSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-warning mb-2">Due Soon ({dueSoon.length})</h3>
          <div className="space-y-1">
            {dueSoon.map((r: any) => (
              <div key={r.id} className="text-sm text-foreground">
                {r.truck?.licensePlate} — {r.type.replace(/_/g, ' ')} — {format(new Date(r.scheduledAt), 'dd/MM/yyyy')}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted">Loading records...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Vehicle', 'Type', 'Scheduled', 'Completed', 'Cost (ETB)', 'Mileage', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(records as any[]).map((r: any) => (
                <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-foreground">{r.truck?.licensePlate}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{r.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-sm text-muted">{format(new Date(r.scheduledAt), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3 text-sm text-muted">{r.completedAt ? format(new Date(r.completedAt), 'dd/MM/yyyy') : '—'}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{r.costEtb ? Number(r.costEtb).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted">{r.mileageKm ? `${r.mileageKm.toLocaleString()} km` : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    {r.status !== 'COMPLETED' && (
                      <button onClick={() => completeRecord.mutate(r.id)}
                        className="text-xs text-primary hover:underline font-medium">
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(records as any[]).length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-muted">No maintenance records</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-foreground mb-5">Log Maintenance</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Vehicle</label>
                <select value={form.truckId} onChange={e => setForm(p => ({ ...p, truckId: e.target.value }))} required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  <option value="">Select vehicle</option>
                  {(trucks as any[]).map((t: any) => <option key={t.id} value={t.id}>{t.licensePlate} — {t.model}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Maintenance Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Scheduled Date</label>
                  <input type="date" value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} required
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Cost (ETB)</label>
                  <input type="number" value={form.costEtb} onChange={e => setForm(p => ({ ...p, costEtb: e.target.value }))} placeholder="Optional"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Optional notes..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-neutral-50">Cancel</button>
              <button onClick={() => addRecord.mutate({ ...form, costEtb: form.costEtb ? Number(form.costEtb) : undefined, mileageKm: form.mileageKm ? Number(form.mileageKm) : undefined })}
                disabled={addRecord.isLoading || !form.truckId || !form.scheduledAt}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-60">
                {addRecord.isLoading ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
