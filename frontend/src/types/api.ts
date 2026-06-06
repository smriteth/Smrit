// Shared TypeScript interfaces for SMRIT API response shapes.
// These replace scattered `as any[]` casts on list pages.

export interface Truck {
  id: string
  licensePlate: string
  model: string
  year: number
  fuelType: 'DIESEL' | 'PETROL' | 'CNG'
  status: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED'
  odometerKm: number
  capacityKg: number
  insuranceExpiry: string | null
  registrationExpiry: string | null
  nextServiceKm: number | null
  insuranceStatus: 'OK' | 'EXPIRING_SOON' | 'EXPIRED'
  registrationStatus: 'OK' | 'EXPIRING_SOON' | 'EXPIRED'
  traccarUniqueId: string
  traccarDeviceId: number | null
  driver: { id: string; name: string } | null
  position: { lat: number; lng: number; speed: number; fixTime: string } | null
}

export interface Driver {
  id: string
  accountId: string
  name: string
  phone: string
  licenseNumber: string
  licenseExpiry: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  assignedTruckId: string | null
  behaviorScore: number
  totalTrips: number
  totalEarningsEtb: number
  emergencyContact: string | null
  createdAt: string
  assignedTruck: { id: string; licensePlate: string; model: string } | null
}

export interface Trip {
  id: string
  accountId: string
  truckId: string
  driverId: string
  status: 'STARTED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'
  originName: string
  destinationName: string
  originLat: number
  originLng: number
  destLat: number
  destLng: number
  startedAt: string
  completedAt: string | null
  actualDistanceKm: number | null
  totalEarningsEtb: number | null
  maxSpeedKmh: number | null
  avgSpeedKmh: number | null
  driver: { id: string; name: string; phone: string } | null
  truck: { id: string; licensePlate: string; model: string } | null
}

export interface Alert {
  id: string
  accountId: string
  type: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  message: string
  isRead: boolean
  truckId: string | null
  driverId: string | null
  createdAt: string
  truck: { licensePlate: string } | null
  driver: { name: string } | null
}

export interface DriverEarning {
  id: string
  driverId: string
  tripId: string
  distanceKm: number
  ratePerKm: number
  baseEarning: number
  bonus: number
  penalty: number
  totalEarning: number
  status: 'PENDING' | 'APPROVED' | 'PAID'
  paymentRef: string | null
  paidAt: string | null
  createdAt: string
  driver: { id: string; name: string } | null
  trip: {
    id: string
    originName: string
    destinationName: string
    startedAt: string
    actualDistanceKm: number | null
  } | null
}

export interface FuelLog {
  id: string
  truckId: string
  driverId: string | null
  liters: number
  costEtb: number
  odometerKm: number
  fuelType: 'DIESEL' | 'PETROL' | 'CNG'
  filledAt: string
  truck: { licensePlate: string } | null
  driver: { name: string } | null
}

export interface Geofence {
  id: string
  accountId: string
  name: string
  description: string | null
  type: 'RESTRICTED' | 'ALLOWED' | 'ALERT'
  polygon: Array<{ lat: number; lng: number }>
  isActive: boolean
  createdAt: string
}

export interface GeofenceEvent {
  id: string
  truckId: string
  geofenceId: string
  eventType: 'ENTER' | 'EXIT'
  occurredAt: string
  truck: { licensePlate: string } | null
  geofence: { name: string; type: string } | null
}

export interface MaintenanceRecord {
  id: string
  truckId: string
  type: string
  status: 'SCHEDULED' | 'COMPLETED' | 'OVERDUE'
  scheduledAt: string
  completedAt: string | null
  costEtb: number | null
  mileageKm: number | null
  notes: string | null
  truck: { licensePlate: string; model: string } | null
}
