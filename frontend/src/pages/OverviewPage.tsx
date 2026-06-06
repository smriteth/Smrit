import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import apiClient from '@/lib/apiClient'
import { Truck, Users, Route, TrendingUp, Wrench, Bell, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

function KpiCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted font-medium uppercase tracking-wide mb-1">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value ?? '—'}</p>
          {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  )
}

function TripStatus({ status }: { status: string }) {
  const styles: Record<string, string> = {
    STARTED: 'bg-blue-100 text-blue-800',
    IN_TRANSIT: 'bg-amber-100 text-amber-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>{status.replace('_', ' ')}</span>
}

export default function OverviewPage() {
  const { data: overview } = useQuery('analytics-overview',
    () => apiClient.get('/analytics/overview').then(r => r.data),
    { refetchInterval: 60_000 }
  )
  const { data: trucks = [] } = useQuery('devices',
    () => apiClient.get('/devices').then(r => r.data),
    { refetchInterval: 30_000 }
  )
  const { data: recentTrips = [] } = useQuery('recent-trips',
    () => apiClient.get('/trips?limit=8').then(r => r.data),
    { refetchInterval: 60_000 }
  )
  const { data: alerts = [] } = useQuery('alerts-unread',
    () => apiClient.get('/alerts?isRead=false&limit=5').then(r => r.data),
    { refetchInterval: 30_000 }
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fleet Overview</h1>
        <p className="text-sm text-muted mt-0.5">Live dashboard — Addis Ababa, Ethiopia</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Vehicles" value={overview?.activeTrucks} icon={Truck} color="bg-primary"
          sub={`of ${overview?.totalFleet ?? '—'} total`} />
        <KpiCard label="Trips Today" value={overview?.tripsToday} icon={Route} color="bg-green-500" />
        <KpiCard label="Drivers On Road" value={overview?.driversOnRoad} icon={Users} color="bg-amber-500" />
        <KpiCard
          label="Revenue Today"
          value={overview?.revenueToday ? `ETB ${Number(overview.revenueToday).toLocaleString()}` : '—'}
          icon={TrendingUp} color="bg-purple-500" />
      </div>

      {overview && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <Wrench size={18} className="text-amber-600 flex-shrink-0" />
            <div><p className="text-xs text-muted">Maintenance Due</p><p className="font-bold text-foreground">{overview.maintenanceDue}</p></div>
            <Link to="/maintenance" className="ml-auto text-xs text-primary hover:underline">View</Link>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <Bell size={18} className="text-danger flex-shrink-0" />
            <div><p className="text-xs text-muted">Unread Alerts</p><p className="font-bold text-foreground">{overview.unreadAlerts}</p></div>
            <Link to="/alerts" className="ml-auto text-xs text-primary hover:underline">View</Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Map */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm text-foreground">Live Fleet Map</h2>
            <span className="text-xs text-muted flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live
            </span>
          </div>
          <div style={{ height: 280 }}>
            <MapContainer center={[9.032, 38.747]} zoom={11} style={{ height: '100%', width: '100%' }} attributionControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {(trucks as any[]).filter(t => t.position).map((truck: any) => (
                <CircleMarker key={truck.id} center={[truck.position.lat, truck.position.lng]}
                  radius={8} fillColor={truck.position.speed > 5 ? '#27AE60' : '#F5A623'}
                  color="white" weight={2} fillOpacity={0.9}>
                  <Popup>
                    <div className="text-sm leading-snug">
                      <p className="font-bold">{truck.licensePlate}</p>
                      <p className="text-gray-500">{truck.driver?.name || 'No driver'}</p>
                      <p>{truck.position.speed} km/h</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          <div className="px-5 py-2.5 border-t border-border flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block" /> Moving</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block" /> Stopped</span>
            <Link to="/map" className="ml-auto text-primary font-medium hover:underline">Open full map →</Link>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-border shadow-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm text-foreground">Recent Trips</h2>
              <Link to="/trips" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {(recentTrips as any[]).slice(0, 5).map((trip: any) => (
                <div key={trip.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{trip.driver?.name}</p>
                      <p className="text-xs text-muted truncate">{trip.originName} → {trip.destinationName}</p>
                    </div>
                    <TripStatus status={trip.status} />
                  </div>
                </div>
              ))}
              {(recentTrips as any[]).length === 0 && (
                <div className="px-4 py-5 text-center text-xs text-muted">No trips yet</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border shadow-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm text-foreground">Alerts</h2>
              <Link to="/alerts" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {(alerts as any[]).slice(0, 4).map((alert: any) => (
                <div key={alert.id} className="px-4 py-3 flex items-start gap-2">
                  <AlertTriangle size={13} className={`flex-shrink-0 mt-0.5 ${alert.severity === 'HIGH' ? 'text-danger' : 'text-warning'}`} />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground leading-snug">{alert.message}</p>
                    <p className="text-xs text-muted mt-0.5">{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</p>
                  </div>
                </div>
              ))}
              {(alerts as any[]).length === 0 && (
                <div className="px-4 py-4 text-center text-xs text-muted flex items-center justify-center gap-1.5">
                  <CheckCircle size={12} className="text-green-500" /> All caught up!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
