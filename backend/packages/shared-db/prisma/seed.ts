import { PrismaClient } from '@prisma/client';
import { ulid } from 'ulid';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('smrit2026', 10);
  const driverPasswordHash = await bcrypt.hash('driver123', 10);

  // ── Account ────────────────────────────────────────────────
  const account = await prisma.fmsAccount.upsert({
    where: { id: 'SMRITDEMOACCOUNT0000000000' },
    update: {},
    create: {
      id: 'SMRITDEMOACCOUNT0000000000',
      name: 'Ethio Logistics PLC',
      contactEmail: 'fleet@ethiologistics.et',
      contactPhone: '+251911000001',
    },
  });

  // ── Admin user ─────────────────────────────────────────────
  await prisma.fmsUser.upsert({
    where: { email: 'admin@smrit.et' },
    update: {},
    create: {
      id: ulid(),
      accountId: account.id,
      email: 'admin@smrit.et',
      passwordHash,
      role: 'FLEET_OWNER',
    },
  });

  // ── Trucks ─────────────────────────────────────────────────
  const insuranceFuture = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
  const regFuture = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const expiringSoon = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);

  const truck1Id = ulid();
  const truck2Id = ulid();
  const truck3Id = ulid();

  const truck1 = await prisma.fmsTruck.upsert({
    where: { licensePlate: 'AA 12345 A' },
    update: {},
    create: {
      id: truck1Id,
      accountId: account.id,
      traccarUniqueId: `SMRIT_${truck1Id}`,
      licensePlate: 'AA 12345 A',
      model: 'Isuzu FVR 34',
      year: 2020,
      capacityKg: 10000,
      fuelType: 'DIESEL',
      odometerKm: 45200,
      insuranceExpiry: insuranceFuture,
      registrationExpiry: regFuture,
      nextServiceKm: 50000,
    },
  });

  const truck2 = await prisma.fmsTruck.upsert({
    where: { licensePlate: 'OR 7891 B' },
    update: {},
    create: {
      id: truck2Id,
      accountId: account.id,
      traccarUniqueId: `SMRIT_${truck2Id}`,
      licensePlate: 'OR 7891 B',
      model: 'Mercedes Actros 2545',
      year: 2019,
      capacityKg: 25000,
      fuelType: 'DIESEL',
      odometerKm: 112400,
      insuranceExpiry: expiringSoon,
      registrationExpiry: insuranceFuture,
      nextServiceKm: 115000,
    },
  });

  const truck3 = await prisma.fmsTruck.upsert({
    where: { licensePlate: 'NN 4562 C' },
    update: {},
    create: {
      id: truck3Id,
      accountId: account.id,
      traccarUniqueId: `SMRIT_${truck3Id}`,
      licensePlate: 'NN 4562 C',
      model: 'Sinotruk HOWO 371',
      year: 2021,
      capacityKg: 30000,
      fuelType: 'DIESEL',
      odometerKm: 28700,
      insuranceExpiry: insuranceFuture,
      registrationExpiry: insuranceFuture,
      status: 'MAINTENANCE',
    },
  });

  // ── Drivers ────────────────────────────────────────────────
  const licenseExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const licenseExpiringSoon = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

  const driver1Id = ulid();
  const driver2Id = ulid();
  const driver3Id = ulid();

  await prisma.fmsDriver.upsert({
    where: { phone: '+251911100001' },
    update: {},
    create: {
      id: driver1Id,
      accountId: account.id,
      name: 'Abebe Girma',
      phone: '+251911100001',
      passwordHash: driverPasswordHash,
      licenseNumber: 'ET-DL-2019-001234',
      licenseExpiry,
      assignedTruckId: truck1.id,
      behaviorScore: 92,
      emergencyContact: '+251911200001',
      totalTrips: 47,
      totalEarningsEtb: 28450,
    },
  });

  await prisma.fmsDriver.upsert({
    where: { phone: '+251911100002' },
    update: {},
    create: {
      id: driver2Id,
      accountId: account.id,
      name: 'Tigist Bekele',
      phone: '+251911100002',
      passwordHash: driverPasswordHash,
      licenseNumber: 'ET-DL-2020-005678',
      licenseExpiry: licenseExpiringSoon,
      assignedTruckId: truck2.id,
      behaviorScore: 78,
      emergencyContact: '+251911200002',
      totalTrips: 31,
      totalEarningsEtb: 19200,
    },
  });

  await prisma.fmsDriver.upsert({
    where: { phone: '+251911100003' },
    update: {},
    create: {
      id: driver3Id,
      accountId: account.id,
      name: 'Samuel Alemu',
      phone: '+251911100003',
      passwordHash: driverPasswordHash,
      licenseNumber: 'ET-DL-2018-009012',
      licenseExpiry,
      behaviorScore: 85,
      emergencyContact: '+251911200003',
      totalTrips: 22,
      totalEarningsEtb: 14800,
    },
  });

  // ── Maintenance records ────────────────────────────────────
  const pastDate = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const futureDate = (daysAhead: number) => new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

  await prisma.fmsMaintenanceRecord.createMany({
    skipDuplicates: true,
    data: [
      {
        id: ulid(),
        accountId: account.id,
        truckId: truck1.id,
        type: 'OIL_CHANGE',
        scheduledAt: futureDate(15),
        status: 'SCHEDULED',
        notes: 'Regular 10,000km oil change',
      },
      {
        id: ulid(),
        accountId: account.id,
        truckId: truck2.id,
        type: 'FULL_SERVICE',
        scheduledAt: pastDate(5),
        status: 'OVERDUE',
        notes: '120,000km full service overdue',
      },
      {
        id: ulid(),
        accountId: account.id,
        truckId: truck3.id,
        type: 'BRAKE_SERVICE',
        scheduledAt: pastDate(2),
        completedAt: pastDate(1),
        costEtb: 3500,
        mileageKm: 28700,
        status: 'COMPLETED',
        notes: 'Front brake pads replaced',
      },
    ],
  });

  // ── Geofences ──────────────────────────────────────────────
  await prisma.fmsGeofence.createMany({
    skipDuplicates: true,
    data: [
      {
        id: ulid(),
        accountId: account.id,
        name: 'Addis Ababa City Boundary',
        description: 'Main operational zone — alert if trucks leave',
        type: 'ALERT',
        isActive: true,
        polygon: [
          { lat: 9.1, lng: 38.65 },
          { lat: 9.1, lng: 38.85 },
          { lat: 8.9, lng: 38.85 },
          { lat: 8.9, lng: 38.65 },
        ],
      },
      {
        id: ulid(),
        accountId: account.id,
        name: 'Bole Industrial Zone',
        description: 'Restricted overnight parking area',
        type: 'RESTRICTED',
        isActive: true,
        polygon: [
          { lat: 8.98, lng: 38.78 },
          { lat: 8.99, lng: 38.78 },
          { lat: 8.99, lng: 38.79 },
          { lat: 8.98, lng: 38.79 },
        ],
      },
    ],
  });

  // ── Sample alerts ──────────────────────────────────────────
  await prisma.fmsAlert.createMany({
    skipDuplicates: true,
    data: [
      {
        id: ulid(),
        accountId: account.id,
        truckId: truck2.id,
        driverId: driver2Id,
        type: 'SPEEDING',
        severity: 'HIGH',
        message: 'Truck OR 7891 B exceeded 120 km/h near Adama road',
        metadata: { speedKmh: 127, location: 'Adama Highway' },
        isRead: false,
      },
      {
        id: ulid(),
        accountId: account.id,
        truckId: truck2.id,
        type: 'MAINTENANCE_DUE',
        severity: 'HIGH',
        message: 'OR 7891 B: Full service overdue by 5 days — schedule immediately',
        isRead: false,
      },
      {
        id: ulid(),
        accountId: account.id,
        driverId: driver2Id,
        type: 'LICENSE_EXPIRY',
        severity: 'MEDIUM',
        message: "Driver Tigist Bekele's license expires in 15 days",
        metadata: { expiresAt: licenseExpiringSoon.toISOString() },
        isRead: false,
      },
      {
        id: ulid(),
        accountId: account.id,
        truckId: truck2.id,
        type: 'DOCUMENT_EXPIRY',
        severity: 'MEDIUM',
        message: 'OR 7891 B insurance expires in 20 days — renew before expiry',
        isRead: true,
      },
    ],
  });

  // ── Fuel logs ──────────────────────────────────────────────
  await prisma.fmsFuelLog.createMany({
    skipDuplicates: true,
    data: [
      {
        id: ulid(),
        accountId: account.id,
        truckId: truck1.id,
        driverId: driver1Id,
        liters: 120,
        costEtb: 8640,
        odometerKm: 45000,
        fuelType: 'DIESEL',
        filledAt: pastDate(3),
      },
      {
        id: ulid(),
        accountId: account.id,
        truckId: truck2.id,
        driverId: driver2Id,
        liters: 200,
        costEtb: 14400,
        odometerKm: 112000,
        fuelType: 'DIESEL',
        filledAt: pastDate(1),
      },
    ],
  });

  console.log('✅ Seed complete.');
  console.log('   Dashboard: admin@smrit.et / smrit2026');
  console.log('   Driver (mobile): +251911100001 / driver123');
  console.log(`   Account: ${account.name}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
