import { describe, it, expect } from 'vitest';
import { GeofenceService, GeoPoint } from '../../services/geofence.service';

// Addis Ababa bounding box polygon (rectangle)
const addisPolygon: GeoPoint[] = [
  { lat: 8.9, lng: 38.65 },
  { lat: 9.1, lng: 38.65 },
  { lat: 9.1, lng: 38.85 },
  { lat: 8.9, lng: 38.85 },
];

// Small zone around Bole Airport
const bolePolygon: GeoPoint[] = [
  { lat: 8.97, lng: 38.78 },
  { lat: 8.99, lng: 38.78 },
  { lat: 8.99, lng: 38.80 },
  { lat: 8.97, lng: 38.80 },
];

describe('GeofenceService.isPointInPolygon', () => {
  it('detects Addis Ababa center inside city polygon', () => {
    const center: GeoPoint = { lat: 9.0, lng: 38.75 };
    expect(GeofenceService.isPointInPolygon(center, addisPolygon)).toBe(true);
  });

  it('detects Dire Dawa as outside Addis polygon', () => {
    const direDawa: GeoPoint = { lat: 9.59, lng: 41.86 };
    expect(GeofenceService.isPointInPolygon(direDawa, addisPolygon)).toBe(false);
  });

  it('returns false for point clearly outside polygon', () => {
    const outside: GeoPoint = { lat: 0, lng: 0 };
    expect(GeofenceService.isPointInPolygon(outside, addisPolygon)).toBe(false);
  });

  it('detects point inside Bole polygon', () => {
    const boleCenter: GeoPoint = { lat: 8.98, lng: 38.79 };
    expect(GeofenceService.isPointInPolygon(boleCenter, bolePolygon)).toBe(true);
  });

  it('detects point outside Bole polygon', () => {
    const outside: GeoPoint = { lat: 9.05, lng: 38.75 };
    expect(GeofenceService.isPointInPolygon(outside, bolePolygon)).toBe(false);
  });
});

describe('GeofenceService.checkPosition', () => {
  const geofences = [
    { id: 'gf1', name: 'Addis City', type: 'ALERT', polygon: addisPolygon },
    { id: 'gf2', name: 'Bole Zone', type: 'RESTRICTED', polygon: bolePolygon },
  ];

  it('returns both geofences for a point inside both', () => {
    const boleCenter: GeoPoint = { lat: 8.98, lng: 38.79 };
    const hits = GeofenceService.checkPosition(boleCenter, geofences);
    expect(hits).toHaveLength(2);
    expect(hits.map((h) => h.geofenceId).sort()).toEqual(['gf1', 'gf2'].sort());
  });

  it('returns only outer geofence for point outside inner one', () => {
    const addisButNotBole: GeoPoint = { lat: 9.05, lng: 38.75 };
    const hits = GeofenceService.checkPosition(addisButNotBole, geofences);
    expect(hits).toHaveLength(1);
    expect(hits[0].geofenceId).toBe('gf1');
  });

  it('returns empty array for point outside all geofences', () => {
    const outside: GeoPoint = { lat: 9.59, lng: 41.86 };
    const hits = GeofenceService.checkPosition(outside, geofences);
    expect(hits).toHaveLength(0);
  });

  it('skips geofences with less than 3 vertices', () => {
    const badGeofences = [{ id: 'bad', name: 'Bad', type: 'ALERT', polygon: [{ lat: 9.0, lng: 38.75 }] }];
    const hits = GeofenceService.checkPosition({ lat: 9.0, lng: 38.75 }, badGeofences);
    expect(hits).toHaveLength(0);
  });
});
