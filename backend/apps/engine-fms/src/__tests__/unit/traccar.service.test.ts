import { describe, it, expect } from 'vitest';
import { TraccarService, TraccarPosition } from '../../services/traccar.service';

const makePos = (lat: number, lng: number, speedKnots = 0): TraccarPosition => ({
  id: 1,
  deviceId: 1,
  latitude: lat,
  longitude: lng,
  altitude: 0,
  speed: speedKnots,
  course: 0,
  accuracy: 5,
  fixTime: new Date().toISOString(),
  deviceTime: new Date().toISOString(),
  attributes: {},
});

describe('TraccarService.haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(TraccarService.haversineKm(9.0, 38.75, 9.0, 38.75)).toBe(0);
  });

  it('returns correct km between Addis Ababa and a nearby point', () => {
    // ~111 km per degree latitude
    const km = TraccarService.haversineKm(9.0, 38.75, 10.0, 38.75);
    expect(km).toBeGreaterThan(109);
    expect(km).toBeLessThan(113);
  });

  it('is symmetric', () => {
    const a = TraccarService.haversineKm(9.0, 38.7, 8.9, 38.8);
    const b = TraccarService.haversineKm(8.9, 38.8, 9.0, 38.7);
    expect(Math.abs(a - b)).toBeLessThan(0.001);
  });

  it('Addis to point ~13 km away', () => {
    const km = TraccarService.haversineKm(9.0, 38.7, 8.9, 38.8);
    expect(km).toBeGreaterThan(12);
    expect(km).toBeLessThan(16);
  });
});

describe('TraccarService.totalDistanceKm', () => {
  it('returns 0 for empty array', () => {
    expect(TraccarService.totalDistanceKm([])).toBe(0);
  });

  it('returns 0 for single position', () => {
    expect(TraccarService.totalDistanceKm([makePos(9.0, 38.75)])).toBe(0);
  });

  it('sums segment distances for multiple positions', () => {
    const positions = [
      makePos(9.0, 38.75),
      makePos(9.1, 38.75), // ~11 km north
      makePos(9.2, 38.75), // ~11 km more
    ];
    const total = TraccarService.totalDistanceKm(positions);
    expect(total).toBeGreaterThan(20);
    expect(total).toBeLessThan(25);
  });

  it('returns rounded to 1 decimal', () => {
    const positions = [makePos(9.0, 38.75), makePos(9.01, 38.75)];
    const total = TraccarService.totalDistanceKm(positions);
    const decimals = (total.toString().split('.')[1] ?? '').length;
    expect(decimals).toBeLessThanOrEqual(1);
  });
});

describe('Speed conversion', () => {
  it('converts 10 knots to 18.52 km/h', () => {
    const kmh = Math.round(10 * 1.852 * 100) / 100;
    expect(kmh).toBe(18.52);
  });

  it('converts 0 knots to 0 km/h', () => {
    expect(Math.round(0 * 1.852)).toBe(0);
  });

  it('converts 54.06 knots to ~100 km/h', () => {
    const kmh = Math.round(54.06 * 1.852);
    expect(kmh).toBe(100);
  });
});
