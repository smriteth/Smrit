import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import apiClient from '@/lib/apiClient'
import { Plus, Search, Truck, AlertTriangle } from 'lucide-react'
import type { Truck as TruckType } from '@/types/api'

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-800', MAINTENANCE: 'bg-amber-100 text-amber-800', RETIRED: 'bg-gray-100 text-gray-600' }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return <span className="text-xs text-muted">—</span>
  const d = new Date(date)
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
  if (days < 0) return <span className="text-xs font-medium text-danger">EXPIRED</span>
  if (days < 30) return <span className="text-xs font-medium text-warning">Exp. in {days}d</span>
  return <span className="text-xs text-muted">{d.toLocaleDateString('en-GB')}</span>
}

export default function FleetPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ licensePlate: '', model: '', year: 2023, capacityKg: 10000, fuelType: 'DIESEL', insuranceExpiry: '', registrationExpiry: '' })

  const { data: trucks = [], isLoading, error } = useQuery<TruckType[]>('devices',
    () => apiClient.get('/devices').then(r => r.data),
    { refetchInterval: 60_000 }
  )

  const addTruck = useMutation(
    (data: typeof form) => apiClient.post('/devices', { ...data, year: Number(data.year), capacityKg: Number(data.capacityKg) }),
    {
      onSuccess: () => { qc.invalidateQueries('devices'); setShowAdd(false); setForm({ licensePlate: '', model: '', year: 2023, capacityKg: 10000, fuelType: 'DIESEL', insuranceExpiry: '', registrationExpiry: '' }) },
    }
  )

  const filtered = trucks.filter(t =>
    t.licensePlate?.toLowerCase().includes(search.toLowerCase()) ||
    t.model?.toLowerCase().includes(search.toLowerCase()) ||
    t.driver?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fleet Management</h1>
          <p className="text-sm text-muted mt-0.5">{trucks.length} vehicles registered</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicles..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-muted text-sm">Loading fleet...</div>
        ) : error ? (
          <div className="py-16 text-center text-danger text-sm">Failed to load fleet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['License Plate', 'Model', 'Fuel', 'Status', 'Driver', 'Ins. Expiry', 'Reg. Expiry', 'Odometer'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((truck: any) => (
                <tr key={truck.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-primary flex-shrink-0" />
                      <span className="text-sm font-semibold text-foreground font-mono">{truck.licensePlate}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{truck.model} ({truck.year})</td>
                  <td className="px-4 py-3 text-xs text-muted">{truck.fuelType}</td>
                  <td className="px-4 py-3"><StatusBadge status={truck.status} /></td>
                  <td className="px-4 py-3 text-sm text-foreground">{truck.driver?.name || <span className="text-muted">Unassigned</span>}</td>
                  <td className="px-4 py-3"><ExpiryBadge date={truck.insuranceExpiry} /></td>
                  <td className="px-4 py-3"><ExpiryBadge date={truck.registrationExpiry} /></td>
                  <td className="px-4 py-3 text-sm text-muted">{truck.odometerKm?.toLocaleString()} km</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-muted">No vehicles found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-foreground mb-5">Add Vehicle</h2>
            <div className="space-y-4">
              {[
                { label: 'License Plate', key: 'licensePlate', placeholder: 'AA 12345 A' },
                { label: 'Model', key: 'model', placeholder: 'Isuzu FVR 34' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-foreground mb-1 block">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} required
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Year</label>
                  <input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Capacity (kg)</label>
                  <input type="number" value={form.capacityKg} onChange={e => setForm(p => ({ ...p, capacityKg: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Fuel Type</label>
                <select value={form.fuelType} onChange={e => setForm(p => ({ ...p, fuelType: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  {['DIESEL', 'PETROL', 'CNG'].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Insurance Expiry</label>
                  <input type="date" value={form.insuranceExpiry} onChange={e => setForm(p => ({ ...p, insuranceExpiry: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Registration Expiry</label>
                  <input type="date" value={form.registrationExpiry} onChange={e => setForm(p => ({ ...p, registrationExpiry: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              </div>
            </div>
            {addTruck.isError && (
              <div className="mt-3 text-xs text-danger flex items-center gap-1">
                <AlertTriangle size={12} /> {(addTruck.error as any)?.response?.data?.error || 'Failed to add vehicle'}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-neutral-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => addTruck.mutate(form)} disabled={addTruck.isLoading}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60">
                {addTruck.isLoading ? 'Adding...' : 'Add Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
