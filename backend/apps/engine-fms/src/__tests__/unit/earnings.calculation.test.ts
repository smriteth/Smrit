import { describe, it, expect } from 'vitest';

// Pure earnings calculation logic extracted for testability
function calculateEarnings(
  actualDistanceKm: number,
  baseRatePerKm: number,
  plannedArrival: Date | null,
  now: Date = new Date(),
): { distanceChargesEtb: number; bonusEtb: number; penaltyEtb: number; totalEarningsEtb: number } {
  const distanceChargesEtb = actualDistanceKm * baseRatePerKm;

  let bonusEtb = 0;
  let penaltyEtb = 0;

  if (plannedArrival) {
    if (now <= plannedArrival) {
      bonusEtb = Math.round(distanceChargesEtb * 0.05 * 100) / 100;
    } else {
      const lateHours = (now.getTime() - plannedArrival.getTime()) / 3_600_000;
      penaltyEtb = Math.round(distanceChargesEtb * 0.02 * lateHours * 100) / 100;
    }
  }

  const totalEarningsEtb = distanceChargesEtb + bonusEtb - penaltyEtb;
  return {
    distanceChargesEtb: Math.round(distanceChargesEtb * 100) / 100,
    bonusEtb,
    penaltyEtb,
    totalEarningsEtb: Math.round(totalEarningsEtb * 100) / 100,
  };
}

describe('Earnings calculation', () => {
  it('calculates base earnings correctly', () => {
    const result = calculateEarnings(100, 15, null);
    expect(result.distanceChargesEtb).toBe(1500);
    expect(result.bonusEtb).toBe(0);
    expect(result.penaltyEtb).toBe(0);
    expect(result.totalEarningsEtb).toBe(1500);
  });

  it('applies 5% on-time bonus when arriving before planned arrival', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const result = calculateEarnings(100, 15, future, new Date());
    expect(result.bonusEtb).toBe(75); // 1500 * 0.05
    expect(result.totalEarningsEtb).toBe(1575);
    expect(result.penaltyEtb).toBe(0);
  });

  it('applies 2% per hour late penalty', () => {
    const past = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const result = calculateEarnings(100, 15, past, new Date());
    // penalty = 1500 * 0.02 * 2 = 60
    expect(result.penaltyEtb).toBeCloseTo(60, 0);
    expect(result.bonusEtb).toBe(0);
    expect(result.totalEarningsEtb).toBeCloseTo(1440, 0);
  });

  it('returns zero earnings for zero distance', () => {
    const result = calculateEarnings(0, 15, null);
    expect(result.distanceChargesEtb).toBe(0);
    expect(result.bonusEtb).toBe(0);
    expect(result.penaltyEtb).toBe(0);
    expect(result.totalEarningsEtb).toBe(0);
  });

  it('no bonus and no penalty when no plannedArrival', () => {
    const result = calculateEarnings(200, 12, null);
    expect(result.bonusEtb).toBe(0);
    expect(result.penaltyEtb).toBe(0);
    expect(result.distanceChargesEtb).toBe(2400);
    expect(result.totalEarningsEtb).toBe(2400);
  });

  it('handles fractional distance correctly', () => {
    const result = calculateEarnings(526.3, 15, null);
    expect(result.distanceChargesEtb).toBeCloseTo(7894.5, 1);
  });
});
