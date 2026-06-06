import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import apiClient from '@/lib/apiClient'
import type { Driver, Truck as TruckType } from '@/types/api'
import { Plus, Search, AlertTriangle, User } from 'lucide-react'

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-800', INACTIVE: 'bg-gray-100 text-gray-600', SUSPENDED: 'bg-red-100 text-red-800' }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-100 text-green-800' : score >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{score}/100</span>
}

function ExpiryBadge({ date }: { date: string }) {
  const d = new Date(date)
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
  if (days < 0) return <span className="text-xs font-medium text-danger">EXPIRED</span>
  if (days < 30) return <span className="text-xs font-medium text-warning">Exp. {days}d</span>
  return <span className="text-xs text-muted">{d.toLocaleDateString('en-GB')}</span>
}

export default function DriversPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '+251', password: '', licenseNumber: '', licenseExpiry: '', assignedTruckId: '' })

  const { data: drivers = [], isLoading } = useQuery<Driver[]>('drivers', () => apiClient.get('/drivers').then(r => r.data))
  const { data: trucks = [] } = useQuery<TruckType[]>('devices-list', () => apiClient.get('/devices').then(r => r.data))

  const addDriver = useMutation(
    (data: any) => apiClient.post('/drivers', data),
    {
      onSuccess: () => { qc.invalidateQueries('drivers'); setShowAdd(false); setForm({ name: '', phone: '+251', password: '', licenseNumber: '', licenseExpiry: '', assignedTruckId: '' }) }
    }
  )

  const filtered = drivers.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.phone?.includes(search) ||
    d.licenseNumber?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Driver Management</h1>
          <p className="text-sm text-muted mt-0.5">{drivers.length} drivers registered</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
          <Plus size={16} /> Add Driver
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search drivers..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-muted text-sm">Loading drivers...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Name', 'Phone', 'License No.', 'Expiry', 'Assigned Truck', 'Score', 'Trips', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d: any) => (
                <tr key={d.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-xs font-bold">{d.name[0]}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground font-mono">{d.phone}</td>
                  <td className="px-4 py-3 text-xs text-muted">{d.licenseNumber}</td>
                  <td className="px-4 py-3"><ExpiryBadge date={d.licenseExpiry} /></td>
                  <td className="px-4 py-3 text-sm text-foreground">{d.assignedTruck?.licensePlate || <span className="text-muted">None</span>}</td>
                  <td className="px-4 py-3"><ScoreBadge score={d.behaviorScore ?? 100} /></td>
                  <td className="px-4 py-3 text-sm text-foreground">{d.totalTrips}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-muted">No drivers found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-foreground mb-5">Add Driver</h2>
            <div className="space-y-4">
              {[
                { label: 'Full Name', key: 'name', placeholder: 'Abebe Girma' },
                { label: 'Phone Number', key: 'phone', placeholder: '+251911100001' },
                { label: 'License Number', key: 'licenseNumber', placeholder: 'ET-DL-2024-001234' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-foreground mb-1 block">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Password (min 6)</label>
                  <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">License Expiry</label>
                  <input type="date" value={form.licenseExpiry} onChange={e => setForm(p => ({ ...p, licenseExpiry: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Assign Truck (optional)</label>
                <select value={form.assignedTruckId} onChange={e => setForm(p => ({ ...p, assignedTruckId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  <option value="">No truck assigned</option>
                  {trucks.filter(t => !t.driver).map((t: any) => (
                    <option key={t.id} value={t.id}>{t.licensePlate} — {t.model}</option>
                  ))}
                </select>
              </div>
            </div>
            {addDriver.isError && (
              <div className="mt-3 text-xs text-danger flex items-center gap-1">
                <AlertTriangle size={12} /> {(addDriver.error as any)?.response?.data?.error || 'Failed to add driver'}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-neutral-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => addDriver.mutate({ ...form, assignedTruckId: form.assignedTruckId || undefined })}
                disabled={addDriver.isLoading || !form.name || !form.phone || !form.password || !form.licenseNumber || !form.licenseExpiry}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60">
                {addDriver.isLoading ? 'Adding...' : 'Add Driver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
