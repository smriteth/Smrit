import { prisma } from '@smrit/shared-db';

export class AnalyticsService {
  static async getOverview(accountId: string) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      activeTrucks,
      tripsToday,
      driversOnRoad,
      revenueTodayAgg,
      totalFleet,
      maintenanceDue,
      unreadAlerts,
      topDriverResult,
    ] = await Promise.all([
      prisma.fmsTruck.count({ where: { accountId, status: 'ACTIVE' } }),
      prisma.fmsTrip.count({ where: { accountId, startedAt: { gte: todayStart } } }),
      prisma.fmsTrip.findMany({
        where: { accountId, status: { in: ['STARTED', 'IN_TRANSIT'] } },
        select: { driverId: true },
        distinct: ['driverId'],
      }).then((r) => r.length),
      prisma.fmsTrip.aggregate({
        where: { accountId, status: 'COMPLETED', completedAt: { gte: todayStart } },
        _sum: { totalEarningsEtb: true },
      }),
      prisma.fmsTruck.count({ where: { accountId } }),
      prisma.fmsMaintenanceRecord.count({
        where: { accountId, status: { in: ['SCHEDULED', 'OVERDUE'] }, scheduledAt: { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.fmsAlert.count({ where: { accountId, isRead: false } }),
      prisma.fmsTrip.groupBy({
        by: ['driverId'],
        where: { accountId, status: 'COMPLETED', startedAt: { gte: weekStart } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      }),
    ]);

    let topDriverName = null;
    let topDriverTrips = 0;
    if (topDriverResult.length > 0) {
      topDriverTrips = topDriverResult[0]._count.id;
      const driver = await prisma.fmsDriver.findUnique({
        where: { id: topDriverResult[0].driverId },
        select: { name: true },
      });
      topDriverName = driver?.name ?? null;
    }

    return {
      activeTrucks,
      tripsToday,
      driversOnRoad,
      revenueToday: (revenueTodayAgg._sum.totalEarningsEtb ?? 0).toString(),
      totalFleet,
      maintenanceDue,
      unreadAlerts,
      topDriverThisWeek: topDriverName ? { name: topDriverName, trips: topDriverTrips } : null,
    };
  }

  static async getTripAnalytics(accountId: string, from: Date, to: Date) {
    const trips = await prisma.fmsTrip.findMany({
      where: { accountId, startedAt: { gte: from, lte: to }, status: 'COMPLETED' },
      select: { startedAt: true, actualDistanceKm: true, totalEarningsEtb: true },
      orderBy: { startedAt: 'asc' },
    });

    // Group by day
    const byDayMap = new Map<string, { count: number; distanceKm: number; revenueEtb: number }>();
    for (const trip of trips) {
      const day = trip.startedAt.toISOString().slice(0, 10);
      const existing = byDayMap.get(day) ?? { count: 0, distanceKm: 0, revenueEtb: 0 };
      existing.count += 1;
      existing.distanceKm += Number(trip.actualDistanceKm ?? 0);
      existing.revenueEtb += Number(trip.totalEarningsEtb);
      byDayMap.set(day, existing);
    }

    const byDay = Array.from(byDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        count: v.count,
        distanceKm: Math.round(v.distanceKm * 10) / 10,
        revenueEtb: Math.round(v.revenueEtb * 100) / 100,
      }));

    const total = trips.length;
    const totalDistanceKm = trips.reduce((s, t) => s + Number(t.actualDistanceKm ?? 0), 0);
    const avgDistanceKm = total > 0 ? Math.round((totalDistanceKm / total) * 10) / 10 : 0;

    return { total, totalDistanceKm: Math.round(totalDistanceKm * 10) / 10, avgDistanceKm, byDay };
  }

  static async getDriverRankings(accountId: string, from: Date, to: Date) {
    const groups = await prisma.fmsTrip.groupBy({
      by: ['driverId'],
      where: { accountId, status: 'COMPLETED', startedAt: { gte: from, lte: to } },
      _count: { id: true },
      _sum: { actualDistanceKm: true, totalEarningsEtb: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const rankings = await Promise.all(
      groups.map(async (g) => {
        const driver = await prisma.fmsDriver.findUnique({
          where: { id: g.driverId },
          select: { name: true, behaviorScore: true },
        });
        return {
          driverId: g.driverId,
          name: driver?.name ?? 'Unknown',
          trips: g._count.id,
          distanceKm: Math.round(Number(g._sum.actualDistanceKm ?? 0) * 10) / 10,
          earningsEtb: Math.round(Number(g._sum.totalEarningsEtb ?? 0) * 100) / 100,
          behaviorScore: driver?.behaviorScore ?? 0,
        };
      }),
    );

    return { rankings };
  }

  static async getCostBreakdown(accountId: string, from: Date, to: Date) {
    const [fuelAgg, maintenanceAgg, fuelLogs, maintenanceLogs] = await Promise.all([
      prisma.fmsFuelLog.aggregate({
        where: { accountId, filledAt: { gte: from, lte: to } },
        _sum: { costEtb: true, liters: true },
      }),
      prisma.fmsMaintenanceRecord.aggregate({
        where: { accountId, completedAt: { gte: from, lte: to }, status: 'COMPLETED' },
        _sum: { costEtb: true },
      }),
      prisma.fmsFuelLog.findMany({
        where: { accountId, filledAt: { gte: from, lte: to } },
        select: { filledAt: true, costEtb: true },
        orderBy: { filledAt: 'asc' },
      }),
      prisma.fmsMaintenanceRecord.findMany({
        where: { accountId, completedAt: { gte: from, lte: to }, status: 'COMPLETED' },
        select: { completedAt: true, costEtb: true },
        orderBy: { completedAt: 'asc' },
      }),
    ]);

    // Group by ISO week
    const weekMap = new Map<string, { fuelEtb: number; maintenanceEtb: number }>();
    const getWeekKey = (d: Date) => {
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return monday.toISOString().slice(0, 10);
    };

    for (const log of fuelLogs) {
      const key = getWeekKey(log.filledAt);
      const e = weekMap.get(key) ?? { fuelEtb: 0, maintenanceEtb: 0 };
      e.fuelEtb += Number(log.costEtb);
      weekMap.set(key, e);
    }
    for (const rec of maintenanceLogs) {
      if (!rec.completedAt) continue;
      const key = getWeekKey(rec.completedAt);
      const e = weekMap.get(key) ?? { fuelEtb: 0, maintenanceEtb: 0 };
      e.maintenanceEtb += Number(rec.costEtb ?? 0);
      weekMap.set(key, e);
    }

    const byWeek = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, v]) => ({
        week,
        fuelEtb: Math.round(v.fuelEtb * 100) / 100,
        maintenanceEtb: Math.round(v.maintenanceEtb * 100) / 100,
      }));

    const fuelTotalEtb = Number(fuelAgg._sum.costEtb ?? 0);
    const maintenanceTotalEtb = Number(maintenanceAgg._sum.costEtb ?? 0);

    return {
      fuelTotalEtb: Math.round(fuelTotalEtb * 100) / 100,
      maintenanceTotalEtb: Math.round(maintenanceTotalEtb * 100) / 100,
      totalEtb: Math.round((fuelTotalEtb + maintenanceTotalEtb) * 100) / 100,
      totalLitersFuel: Math.round(Number(fuelAgg._sum.liters ?? 0) * 10) / 10,
      byWeek,
    };
  }
}
