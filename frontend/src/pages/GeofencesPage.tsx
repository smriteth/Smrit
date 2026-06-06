import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { MapContainer, TileLayer, Polygon, Tooltip, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import apiClient from '@/lib/apiClient'
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { format } from 'date-fns'

type GeoPoint = { lat: number; lng: number }

function TypeBadge({ type }: { type: string }) {
  const s: Record<string, string> = { RESTRICTED: 'bg-red-100 text-red-800', ALLOWED: 'bg-green-100 text-green-800', ALERT: 'bg-amber-100 text-amber-800' }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s[type] || 'bg-gray-100 text-gray-600'}`}>{type}</span>
}

const GEOFENCE_COLOR: Record<string, string> = { RESTRICTED: '#E74C3C', ALLOWED: '#27AE60', ALERT: '#F5A623' }

function PolygonDrawer({ onAdd }: { onAdd: (pt: GeoPoint) => void }) {
  useMapEvents({
    dblclick(e) { onAdd({ lat: e.latlng.lat, lng: e.latlng.lng }) },
    click(e) { onAdd({ lat: e.latlng.lat, lng: e.latlng.lng }) },
  })
  return null
}

export default function GeofencesPage() {
  const qc = useQueryClient()
  const [drawing, setDrawing] = useState(false)
  const [points, setPoints] = useState<GeoPoint[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', type: 'ALERT' })

  const { data: geofences = [] } = useQuery('geofences', () => apiClient.get('/geofences').then(r => r.data))
  const { data: events = [] } = useQuery('geofence-events', () => apiClient.get('/geofences/events?limit=30').then(r => r.data), { refetchInterval: 60_000 })

  const createGeofence = useMutation(
    (data: any) => apiClient.post('/geofences', data),
    { onSuccess: () => { qc.invalidateQueries('geofences'); setShowModal(false); setPoints([]); setDrawing(false) } }
  )

  const toggleActive = useMutation(
    ({ id, isActive }: { id: string; isActive: boolean }) => apiClient.patch(`/geofences/${id}`, { isActive }),
    { onSuccess: () => qc.invalidateQueries('geofences') }
  )

  const deleteGeofence = useMutation(
    (id: string) => apiClient.delete(`/geofences/${id}`),
    { onSuccess: () => qc.invalidateQueries('geofences') }
  )

  const finishDrawing = () => {
    if (points.length >= 3) setShowModal(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Geofences</h1>
          <p className="text-sm text-muted mt-0.5">Define zones and alert boundaries</p>
        </div>
        <div className="flex gap-2">
          {drawing && points.length >= 3 && (
            <button onClick={finishDrawing}
              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600">
              Finish Zone ({points.length} points)
            </button>
          )}
          <button onClick={() => { setDrawing(!drawing); setPoints([]) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${drawing ? 'bg-danger text-white hover:bg-red-700' : 'bg-primary text-white hover:bg-primary-dark'}`}>
            {drawing ? 'Cancel Drawing' : <><Plus size={14} className="inline mr-1" /> Create Zone</>}
          </button>
        </div>
      </div>

      {drawing && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          Click on the map to add polygon vertices. Add at least 3 points, then click "Finish Zone".
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Geofence list */}
        <div className="lg:col-span-2 space-y-3">
          {(geofences as any[]).length === 0 && (
            <div className="bg-white rounded-xl border border-border p-8 text-center text-sm text-muted">
              No geofences defined. Click "Create Zone" to start.
            </div>
          )}
          {(geofences as any[]).map((gf: any) => (
            <div key={gf.id} className="bg-white rounded-xl border border-border p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{gf.name}</p>
                  {gf.description && <p className="text-xs text-muted mt-0.5 truncate">{gf.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <TypeBadge type={gf.type} />
                    <span className={`text-xs ${gf.isActive ? 'text-green-600' : 'text-muted'}`}>{gf.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleActive.mutate({ id: gf.id, isActive: !gf.isActive })}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
                    {gf.isActive ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-muted" />}
                  </button>
                  <button onClick={() => { if (confirm('Delete this geofence?')) deleteGeofence.mutate(gf.id) }}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={15} className="text-danger" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-border shadow-card overflow-hidden" style={{ height: 480 }}>
          <MapContainer center={[9.032, 38.747]} zoom={11} style={{ height: '100%', width: '100%' }} attributionControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {drawing && <PolygonDrawer onAdd={pt => setPoints(p => [...p, pt])} />}
            {points.length >= 2 && (
              <Polygon positions={points.map(p => [p.lat, p.lng] as [number, number])}
                color="#1B4F8A" fillOpacity={0.2} dashArray="5,5" />
            )}
            {(geofences as any[]).filter(g => g.isActive).map((gf: any) => (
              <Polygon key={gf.id}
                positions={(gf.polygon as GeoPoint[]).map(p => [p.lat, p.lng] as [number, number])}
                color={GEOFENCE_COLOR[gf.type] || '#1B4F8A'} fillOpacity={0.1} weight={2}>
                <Tooltip sticky>{gf.name}</Tooltip>
              </Polygon>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Recent Events */}
      {(events as any[]).length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-sm text-foreground">Recent Geofence Events</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Vehicle', 'Zone', 'Event', 'Time'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(events as any[]).map((e: any) => (
                <tr key={e.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm font-mono text-foreground">{e.truck?.licensePlate}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{e.geofence?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${e.eventType === 'ENTER' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {e.eventType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{format(new Date(e.occurredAt), 'dd/MM/yy HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Name this Zone</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Zone Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Addis Ababa Boundary"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  <option value="ALERT">ALERT — Notify when vehicles enter/exit</option>
                  <option value="RESTRICTED">RESTRICTED — Vehicles should not enter</option>
                  <option value="ALLOWED">ALLOWED — Vehicles must stay within</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Description (optional)</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setPoints([]); setDrawing(false) }}
                className="flex-1 py-2 border border-border rounded-lg text-sm hover:bg-neutral-50">Cancel</button>
              <button onClick={() => createGeofence.mutate({ ...form, polygon: points })}
                disabled={!form.name || createGeofence.isLoading}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-60">
                {createGeofence.isLoading ? 'Saving...' : 'Create Zone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
