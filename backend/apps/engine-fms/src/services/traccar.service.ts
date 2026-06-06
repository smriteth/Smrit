import axios, { AxiosInstance } from 'axios';

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: string; // 'online' | 'offline' | 'unknown'
  lastUpdate: string;
  positionId: number;
  attributes: Record<string, unknown>;
}

export interface TraccarPosition {
  id: number;
  deviceId: number;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;   // knots - convert to km/h by multiplying by 1.852
  course: number;
  accuracy: number;
  fixTime: string;
  deviceTime: string;
  attributes: Record<string, unknown>;
}

export class TraccarService {
  private client: AxiosInstance;

  constructor(
    private readonly traccarUrl: string,
    adminEmail: string,
    adminPassword: string,
  ) {
    const token = Buffer.from(`${adminEmail}:${adminPassword}`).toString('base64');
    this.client = axios.create({
      baseURL: `${traccarUrl.replace(/\/$/, '')}/api`,
      headers: { Authorization: `Basic ${token}` },
      timeout: 5000,
    });
  }

  async createDevice(name: string, uniqueId: string): Promise<TraccarDevice> {
    const res = await this.client.post('/devices', { name, uniqueId });
    return res.data;
  }

  async getDevices(): Promise<TraccarDevice[]> {
    const res = await this.client.get('/devices');
    return res.data;
  }

  async getDevice(deviceId: number): Promise<TraccarDevice> {
    const res = await this.client.get(`/devices/${deviceId}`);
    return res.data;
  }

  async deleteDevice(deviceId: number): Promise<void> {
    await this.client.delete(`/devices/${deviceId}`);
  }

  async getPositions(deviceId: number, from: Date, to: Date): Promise<TraccarPosition[]> {
    const res = await this.client.get('/positions', {
      params: {
        deviceId,
        from: from.toISOString(),
        to: to.toISOString(),
      },
    });
    return res.data;
  }

  async getLatestPositions(): Promise<TraccarPosition[]> {
    // Returns latest position for ALL devices
    const res = await this.client.get('/positions');
    return res.data;
  }

  // Calculate distance between two lat/lng points using Haversine formula
  // Returns distance in kilometers
  static haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Calculate total distance from array of positions
  static totalDistanceKm(positions: TraccarPosition[]): number {
    let total = 0;
    for (let i = 1; i < positions.length; i++) {
      total += TraccarService.haversineKm(
        positions[i - 1].latitude,
        positions[i - 1].longitude,
        positions[i].latitude,
        positions[i].longitude,
      );
    }
    return Math.round(total * 10) / 10;
  }
}
