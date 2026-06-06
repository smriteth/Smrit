import { useState } from 'react'
import { useQuery } from 'react-query'
import apiClient from '@/lib/apiClient'
import type { Trip } from '@/types/api'
import { Search, Download } from 'lucide-react'
import { format } from 'date-fns'

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    STARTED: 'bg-blue-100 text-blue-800',
    IN_TRANSIT: 'bg-amber-100 text-amber-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s[status] || 'bg-gray-100 text-gray-600'}`}>{status.replace('_', ' ')}</span>
}

export default function TripsPage() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const { data: trips = [], isLoading } = useQuery<Trip[]>(
    ['trips', status],
    () => apiClient.get(`/trips?limit=100${status ? `&status=${status}` : ''}`).then(r => r.data),
    { refetchInterval: 60_000 }
  )

  const filtered = trips.filter(t =>
    !search ||
    t.driver?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.originName?.toLowerCase().includes(search.toLowerCase()) ||
    t.destinationName?.toLowerCase().includes(search.toLowerCase()) ||
    t.truck?.licensePlate?.toLowerCase().includes(search.toLowerCase())
  )

  const exportCSV = () => {
    const headers = ['ID','Driver','Vehicle','Origin','Destination','Distance (km)','Status','Earnings (ETB)','Date']
    const rows = filtered.map(t => [
      t.id, t.driver?.name, t.truck?.licensePlate,
      t.originName, t.destinationName,
      t.actualDistanceKm || '',
      t.status,
      t.totalEarningsEtb || 0,
      t.startedAt ? format(new Date(t.startedAt), 'dd/MM/yyyy HH:mm') : ''
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    a.download = `smrit-trips-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trip History</h1>
          <p className="text-sm text-muted mt-0.5">{filtered.length} trips</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 border border-border bg-white rounded-lg text-sm text-foreground hover:bg-neutral-50 transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trips..."
            className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white w-56 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
          <option value="">All Status</option>
          {['STARTED', 'IN_TRANSIT', 'COMPLETED', 'FAILED'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted">Loading trips...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Driver', 'Vehicle', 'Route', 'Distance', 'Duration', 'Status', 'Earnings (ETB)', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((trip: any) => {
                  const dur = trip.startedAt && trip.completedAt
                    ? Math.round((new Date(trip.completedAt).getTime() - new Date(trip.startedAt).getTime()) / 60000)
                    : null
                  return (
                    <tr key={trip.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{trip.driver?.name}</td>
                      <td className="px-4 py-3 text-sm text-muted font-mono">{trip.truck?.licensePlate}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-foreground max-w-40 truncate">{trip.originName} → {trip.destinationName}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{trip.actualDistanceKm ? `${trip.actualDistanceKm} km` : '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted">{dur ? `${dur} min` : '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={trip.status} /></td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{Number(trip.totalEarningsEtb) > 0 ? Number(trip.totalEarningsEtb).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{trip.startedAt ? format(new Date(trip.startedAt), 'dd/MM/yy HH:mm') : '—'}</td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-sm text-muted">No trips found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
