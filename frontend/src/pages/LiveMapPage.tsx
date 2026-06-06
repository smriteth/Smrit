import { useState } from 'react'
import { useQuery } from 'react-query'
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import apiClient from '@/lib/apiClient'

export default function LiveMapPage() {
  const [filter, setFilter] = useState<'ALL' | 'MOVING' | 'STOPPED'>('ALL')
  const [showGeofences, setShowGeofences] = useState(false)

  const { data: trucks = [] } = useQuery('devices-map',
    () => apiClient.get('/devices').then(r => r.data),
    { refetchInterval: 15_000 }
  )
  const { data: geofences = [] } = useQuery('geofences-map',
    () => apiClient.get('/geofences').then(r => r.data),
    { enabled: showGeofences }
  )

  const filtered = (trucks as any[]).filter(t => {
    if (filter === 'MOVING') return t.position?.speed > 5
    if (filter === 'STOPPED') return t.position && t.position.speed <= 5
    return true
  })

  const geofenceColor: Record<string, string> = { RESTRICTED: '#E74C3C', ALLOWED: '#27AE60', ALERT: '#F5A623' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Live Fleet Map</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showGeofences} onChange={e => setShowGeofences(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary" />
            Show Geofences
          </label>
          {(['ALL', 'MOVING', 'STOPPED'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-white border border-border text-foreground hover:bg-neutral-50'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
        <MapContainer center={[9.032, 38.747]} zoom={11} style={{ height: '100%', width: '100%' }} attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />

          {filtered.filter(t => t.position).map((truck: any) => (
            <CircleMarker key={truck.id}
              center={[truck.position.lat, truck.position.lng]}
              radius={9}
              fillColor={truck.position.speed > 5 ? '#27AE60' : '#F5A623'}
              color="white" weight={2} fillOpacity={0.9}>
              <Tooltip permanent direction="top" offset={[0, -10]} opacity={0.9}
                className="text-xs font-medium bg-white border-0 shadow px-2 py-1 rounded">
                {truck.licensePlate}
              </Tooltip>
              <Popup>
                <div className="text-sm leading-relaxed">
                  <p className="font-bold text-base mb-1">{truck.licensePlate}</p>
                  <p><span className="text-gray-500">Model:</span> {truck.model}</p>
                  <p><span className="text-gray-500">Driver:</span> {truck.driver?.name || 'None'}</p>
                  <p><span className="text-gray-500">Speed:</span> {truck.position.speed} km/h</p>
                  <p><span className="text-gray-500">Updated:</span> {truck.position.fixTime ? new Date(truck.position.fixTime).toLocaleTimeString() : 'Unknown'}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {showGeofences && (geofences as any[]).filter(g => g.isActive).map((gf: any) => (
            <Polygon key={gf.id}
              positions={(gf.polygon as any[]).map((p: any) => [p.lat, p.lng])}
              color={geofenceColor[gf.type] || '#1B4F8A'}
              fillOpacity={0.1} weight={2}>
              <Tooltip sticky>{gf.name} ({gf.type})</Tooltip>
            </Polygon>
          ))}
        </MapContainer>
      </div>

      <div className="flex items-center gap-6 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded-full" /> Moving ({(trucks as any[]).filter(t => t.position?.speed > 5).length})</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-500 rounded-full" /> Stopped ({(trucks as any[]).filter(t => t.position && t.position.speed <= 5).length})</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-gray-300 rounded-full" /> No GPS ({(trucks as any[]).filter(t => !t.position).length})</span>
      </div>
    </div>
  )
}
