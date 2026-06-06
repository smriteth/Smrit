export interface GeoPoint {
  lat: number;
  lng: number;
}

export class GeofenceService {
  // Ray casting algorithm — works for any non-self-intersecting polygon
  static isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
    const { lat: px, lng: py } = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;
      const intersect =
        yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Check a position against all active geofences for an account.
  // Returns array of {geofenceId, geofenceName, geofenceType} for every zone the point is inside.
  static checkPosition(
    point: GeoPoint,
    geofences: Array<{ id: string; name: string; type: string; polygon: unknown }>,
  ): Array<{ geofenceId: string; geofenceName: string; geofenceType: string }> {
    const hits: Array<{ geofenceId: string; geofenceName: string; geofenceType: string }> = [];
    for (const gf of geofences) {
      const polygon = gf.polygon as GeoPoint[];
      if (!Array.isArray(polygon) || polygon.length < 3) continue;
      if (GeofenceService.isPointInPolygon(point, polygon)) {
        hits.push({ geofenceId: gf.id, geofenceName: gf.name, geofenceType: gf.type });
      }
    }
    return hits;
  }
}
