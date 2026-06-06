import { ulid } from 'ulid';
import { prisma } from '@smrit/shared-db';

export type AlertType =
  | 'SPEEDING'
  | 'GEOFENCE_VIOLATION'
  | 'MAINTENANCE_DUE'
  | 'LICENSE_EXPIRY'
  | 'IDLE'
  | 'DOCUMENT_EXPIRY';

export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CreateAlertInput {
  accountId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  truckId?: string;
  driverId?: string;
  metadata?: Record<string, unknown>;
}

export class AlertService {
  static async createAlert(input: CreateAlertInput) {
    try {
      return await prisma.fmsAlert.create({
        data: {
          id: ulid(),
          accountId: input.accountId,
          type: input.type,
          severity: input.severity,
          message: input.message,
          truckId: input.truckId ?? null,
          driverId: input.driverId ?? null,
          metadata: input.metadata ? (input.metadata as object) : undefined,
          isRead: false,
        },
      });
    } catch {
      // Alert creation must never crash the caller
    }
  }

  static async checkAndCreateExpiryAlerts(accountId: string) {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Trucks with expiring insurance or registration
    const trucks = await prisma.fmsTruck.findMany({
      where: {
        accountId,
        status: { not: 'RETIRED' },
        OR: [
          { insuranceExpiry: { lte: soon } },
          { registrationExpiry: { lte: soon } },
        ],
      },
    });

    for (const truck of trucks) {
      if (truck.insuranceExpiry && truck.insuranceExpiry <= soon) {
        const daysLeft = Math.ceil((truck.insuranceExpiry.getTime() - now.getTime()) / 86_400_000);
        const alreadyExists = await prisma.fmsAlert.findFirst({
          where: {
            accountId,
            truckId: truck.id,
            type: 'DOCUMENT_EXPIRY',
            isRead: false,
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });
        if (!alreadyExists) {
          await AlertService.createAlert({
            accountId,
            type: 'DOCUMENT_EXPIRY',
            severity: daysLeft <= 7 ? 'HIGH' : 'MEDIUM',
            message: `${truck.licensePlate} insurance expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
            truckId: truck.id,
            metadata: { expiresAt: truck.insuranceExpiry.toISOString(), daysLeft },
          });
        }
      }
    }

    // Drivers with expiring licenses
    const drivers = await prisma.fmsDriver.findMany({
      where: {
        accountId,
        status: 'ACTIVE',
        licenseExpiry: { lte: soon },
      },
    });

    for (const driver of drivers) {
      const daysLeft = Math.ceil((driver.licenseExpiry.getTime() - now.getTime()) / 86_400_000);
      const alreadyExists = await prisma.fmsAlert.findFirst({
        where: {
          accountId,
          driverId: driver.id,
          type: 'LICENSE_EXPIRY',
          isRead: false,
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!alreadyExists) {
        await AlertService.createAlert({
          accountId,
          type: 'LICENSE_EXPIRY',
          severity: daysLeft <= 7 ? 'HIGH' : 'MEDIUM',
          message: `Driver ${driver.name}'s license expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
          driverId: driver.id,
          metadata: { expiresAt: driver.licenseExpiry.toISOString(), daysLeft },
        });
      }
    }

    // Overdue maintenance
    const overdueMaintenance = await prisma.fmsMaintenanceRecord.findMany({
      where: { accountId, status: 'SCHEDULED', scheduledAt: { lt: now } },
      include: { truck: true },
    });

    for (const record of overdueMaintenance) {
      // Update to OVERDUE status
      await prisma.fmsMaintenanceRecord.update({
        where: { id: record.id },
        data: { status: 'OVERDUE' },
      });
      const alreadyExists = await prisma.fmsAlert.findFirst({
        where: {
          accountId,
          truckId: record.truckId,
          type: 'MAINTENANCE_DUE',
          isRead: false,
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!alreadyExists) {
        await AlertService.createAlert({
          accountId,
          type: 'MAINTENANCE_DUE',
          severity: 'HIGH',
          message: `${record.truck.licensePlate}: ${record.type.replace('_', ' ')} is overdue`,
          truckId: record.truckId,
          metadata: { maintenanceId: record.id, type: record.type },
        });
      }
    }
  }
}
