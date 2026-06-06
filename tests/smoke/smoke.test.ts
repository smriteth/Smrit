/**
 * Smoke tests — run against a live stack.
 * Set TEST_API_URL env var (default: http://localhost:3016)
 */
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = process.env.TEST_API_URL ?? 'http://localhost:3016';

describe('Smoke Tests — SMRIT API', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await fetch(`${BASE}/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string; service: string };
    expect(body.status).toBe('ok');
    expect(body.service).toBe('engine-fms');
  });

  it('POST /api/auth/login with demo credentials returns token', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@smrit.et', password: 'smrit2026' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { token?: string };
    expect(body.token).toBeTruthy();
  });

  it('GET /api/devices returns array for authenticated user', async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@smrit.et', password: 'smrit2026' }),
    });
    const { token } = await loginRes.json() as { token: string };

    const res = await fetch(`${BASE}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('GET /api/analytics/overview returns expected KPI fields', async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@smrit.et', password: 'smrit2026' }),
    });
    const { token } = await loginRes.json() as { token: string };

    const res = await fetch(`${BASE}/api/analytics/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.activeTrucks).toBe('number');
    expect(typeof body.unreadAlerts).toBe('number');
    expect(typeof body.revenueToday).toBe('string');
  });

  it('GET /api/alerts/unread-count returns count', async () => {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@smrit.et', password: 'smrit2026' }),
    });
    const { token } = await loginRes.json() as { token: string };

    const res = await fetch(`${BASE}/api/alerts/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { count: number };
    expect(typeof body.count).toBe('number');
    expect(body.count).toBeGreaterThanOrEqual(0);
  });
});
