import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import apiClient from '@/lib/apiClient'
import { Plus, Fuel } from 'lucide-react'
import { format } from 'date-fns'

export default function FuelPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ truckId: '', liters: '', costEtb: '', odometerKm: '', fuelType: 'DIESEL', filledAt: '' })

  const { data: logs = [], isLoading } = useQuery('fuel-logs', () => apiClient.get('/fuel?limit=100').then(r => r.data))
  const { data: stats } = useQuery('fuel-stats', () => apiClient.get('/fuel/stats').then(r => r.data), { refetchInterval: 300_000 })
  const { data: trucks = [] } = useQuery('devices-list', () => apiClient.get('/devices').then(r => r.data))

  const addLog = useMutation(
    (data: any) => apiClient.post('/fuel', data),
    { onSuccess: () => { qc.invalidateQueries('fuel-logs'); qc.invalidateQueries('fuel-stats'); setShowAdd(false) } }
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fuel Management</h1>
          <p className="text-sm text-muted mt-0.5">Track fill-ups and consumption</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
          <Plus size={16} /> Log Fill-Up
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-border p-5 shadow-card">
            <p className="text-xs text-muted font-medium uppercase tracking-wide mb-1">Total Cost (period)</p>
            <p className="text-2xl font-bold text-foreground">ETB {Number(stats.totalCostEtb).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-5 shadow-card">
            <p className="text-xs text-muted font-medium uppercase tracking-wide mb-1">Total Liters</p>
            <p className="text-2xl font-bold text-foreground">{Number(stats.totalLiters).toLocaleString()} L</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-5 shadow-card">
            <p className="text-xs text-muted font-medium uppercase tracking-wide mb-1">Avg Consumption</p>
            <p className="text-2xl font-bold text-foreground">{stats.avgLitersPer100km} L/100km</p>
          </div>
        </div>
      )}

      {stats?.byWeek?.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-card p-5">
          <h2 className="font-semibold text-sm text-foreground mb-4">Weekly Fuel Cost (ETB)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.byWeek}>
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [`ETB ${Number(v).toLocaleString()}`, 'Cost']} />
              <Bar dataKey="costEtb" fill="#F5A623" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted">Loading fuel logs...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Vehicle', 'Driver', 'Liters', 'Cost (ETB)', 'Odometer', 'Fuel Type', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(logs as any[]).map((log: any) => (
                <tr key={log.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-foreground">{log.truck?.licensePlate}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{log.driver?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{Number(log.liters).toLocaleString()} L</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">ETB {Number(log.costEtb).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-muted">{log.odometerKm.toLocaleString()} km</td>
                  <td className="px-4 py-3 text-xs text-muted">{log.fuelType}</td>
                  <td className="px-4 py-3 text-xs text-muted">{format(new Date(log.filledAt), 'dd/MM/yyyy HH:mm')}</td>
                </tr>
              ))}
              {(logs as any[]).length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-muted">No fuel logs yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-foreground mb-5">Log Fill-Up</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Vehicle</label>
                <select value={form.truckId} onChange={e => setForm(p => ({ ...p, truckId: e.target.value }))} required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  <option value="">Select vehicle</option>
                  {(trucks as any[]).map((t: any) => <option key={t.id} value={t.id}>{t.licensePlate}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Liters', key: 'liters', placeholder: '120' },
                  { label: 'Cost (ETB)', key: 'costEtb', placeholder: '8640' },
                  { label: 'Odometer (km)', key: 'odometerKm', placeholder: '45000' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-foreground mb-1 block">{f.label}</label>
                    <input type="number" value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Date & Time</label>
                  <input type="datetime-local" value={form.filledAt} onChange={e => setForm(p => ({ ...p, filledAt: e.target.value }))}
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
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-neutral-50">Cancel</button>
              <button onClick={() => addLog.mutate({ ...form, liters: Number(form.liters), costEtb: Number(form.costEtb), odometerKm: Number(form.odometerKm), filledAt: form.filledAt || new Date().toISOString() })}
                disabled={addLog.isLoading || !form.truckId || !form.liters || !form.costEtb || !form.odometerKm}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-60">
                {addLog.isLoading ? 'Saving...' : 'Log Fill-Up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
