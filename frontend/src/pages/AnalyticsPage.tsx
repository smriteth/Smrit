import { useState } from 'react'
import { useQuery } from 'react-query'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts'
import apiClient from '@/lib/apiClient'
import { format, subDays } from 'date-fns'

const COLORS = ['#1B4F8A', '#F5A623', '#27AE60', '#E74C3C', '#9B59B6']

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const from = subDays(new Date(), days).toISOString()
  const to = new Date().toISOString()

  const { data: overview } = useQuery('analytics-overview', () => apiClient.get('/analytics/overview').then(r => r.data))
  const { data: tripData } = useQuery(['analytics-trips', days], () => apiClient.get(`/analytics/trips?from=${from}&to=${to}`).then(r => r.data))
  const { data: driverData } = useQuery(['analytics-drivers', days], () => apiClient.get(`/analytics/drivers?from=${from}&to=${to}`).then(r => r.data))
  const { data: costData } = useQuery(['analytics-costs', days], () => apiClient.get(`/analytics/costs?from=${from}&to=${to}`).then(r => r.data))
  const { data: trucks = [] } = useQuery('devices-chart', () => apiClient.get('/devices').then(r => r.data))

  const fleetStatus = [
    { name: 'Active', value: (trucks as any[]).filter(t => t.status === 'ACTIVE').length },
    { name: 'Maintenance', value: (trucks as any[]).filter(t => t.status === 'MAINTENANCE').length },
    { name: 'Retired', value: (trucks as any[]).filter(t => t.status === 'RETIRED').length },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted mt-0.5">Fleet performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${days === d ? 'bg-primary text-white' : 'bg-white border border-border text-foreground hover:bg-neutral-50'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Trips', value: tripData?.total ?? '—' },
            { label: 'Total Distance', value: tripData?.totalDistanceKm ? `${tripData.totalDistanceKm.toLocaleString()} km` : '—' },
            { label: 'Fleet Utilization', value: overview.totalFleet ? `${Math.round((overview.activeTrucks / overview.totalFleet) * 100)}%` : '—' },
            { label: 'Total Fuel Cost', value: costData?.fuelTotalEtb ? `ETB ${Number(costData.fuelTotalEtb).toLocaleString()}` : '—' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-border p-5 shadow-card">
              <p className="text-xs text-muted font-medium uppercase tracking-wide mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Trips per day */}
        {tripData?.byDay?.length > 0 && (
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <h3 className="font-semibold text-sm text-foreground mb-4">Trips Per Day</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={tripData.byDay}>
                <defs>
                  <linearGradient id="tripGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B4F8A" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1B4F8A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => format(new Date(d), 'MM/dd')} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip labelFormatter={d => format(new Date(d), 'dd MMM')} />
                <Area type="monotone" dataKey="count" stroke="#1B4F8A" fill="url(#tripGrad)" strokeWidth={2} name="Trips" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Revenue per day */}
        {tripData?.byDay?.length > 0 && (
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <h3 className="font-semibold text-sm text-foreground mb-4">Revenue (ETB)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={tripData.byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => format(new Date(d), 'MM/dd')} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip labelFormatter={d => format(new Date(d), 'dd MMM')} formatter={(v: any) => [`ETB ${Number(v).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenueEtb" fill="#F5A623" radius={[3, 3, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Drivers */}
        {driverData?.rankings?.length > 0 && (
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <h3 className="font-semibold text-sm text-foreground mb-4">Top Drivers by Trips</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={driverData.rankings.slice(0, 5)} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v: any) => [v, 'Trips']} />
                <Bar dataKey="trips" fill="#1B4F8A" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Fleet Status Pie */}
        {fleetStatus.length > 0 && (
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <h3 className="font-semibold text-sm text-foreground mb-4">Fleet Status</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={fleetStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                    {fleetStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {fleetStatus.map((d: any, i: number) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-foreground">{d.name}</span>
                    <span className="text-xs font-bold text-foreground ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Cost Breakdown */}
        {costData?.byWeek?.length > 0 && (
          <div className="bg-white rounded-xl border border-border shadow-card p-5 lg:col-span-2">
            <h3 className="font-semibold text-sm text-foreground mb-4">Weekly Cost Breakdown (ETB)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={costData.byWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [`ETB ${Number(v).toLocaleString()}`]} />
                <Bar dataKey="fuelEtb" fill="#F5A623" name="Fuel" stackId="a" />
                <Bar dataKey="maintenanceEtb" fill="#1B4F8A" name="Maintenance" stackId="a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
