-- Initial SMRIT schema baseline

CREATE TABLE "fms_accounts" (
  "id" VARCHAR(26) NOT NULL,
  "name" TEXT NOT NULL,
  "contact_email" TEXT NOT NULL,
  "contact_phone" TEXT NOT NULL,
  "traccar_user_id" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fms_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fms_users" (
  "id" VARCHAR(26) NOT NULL,
  "account_id" VARCHAR(26) NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'FLEET_MANAGER',
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fms_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fms_users_email_key" ON "fms_users"("email");
CREATE INDEX "fms_users_account_id_idx" ON "fms_users"("account_id");

CREATE TABLE "fms_trucks" (
  "id" VARCHAR(26) NOT NULL,
  "account_id" VARCHAR(26) NOT NULL,
  "traccar_device_id" INTEGER,
  "traccar_unique_id" TEXT NOT NULL,
  "license_plate" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "capacity_kg" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "fuel_type" TEXT NOT NULL DEFAULT 'DIESEL',
  "odometer_km" INTEGER NOT NULL DEFAULT 0,
  "insurance_expiry" TIMESTAMP(3),
  "registration_expiry" TIMESTAMP(3),
  "next_service_km" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fms_trucks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fms_trucks_traccar_unique_id_key" ON "fms_trucks"("traccar_unique_id");
CREATE UNIQUE INDEX "fms_trucks_license_plate_key" ON "fms_trucks"("license_plate");
CREATE INDEX "fms_trucks_account_id_idx" ON "fms_trucks"("account_id");
CREATE INDEX "fms_trucks_traccar_device_id_idx" ON "fms_trucks"("traccar_device_id");

CREATE TABLE "fms_drivers" (
  "id" VARCHAR(26) NOT NULL,
  "account_id" VARCHAR(26) NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "license_number" TEXT NOT NULL,
  "license_expiry" TIMESTAMP(3) NOT NULL,
  "assigned_truck_id" VARCHAR(26),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "total_trips" INTEGER NOT NULL DEFAULT 0,
  "total_earnings_etb" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "behavior_score" INTEGER NOT NULL DEFAULT 100,
  "emergency_contact" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fms_drivers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fms_drivers_phone_key" ON "fms_drivers"("phone");
CREATE UNIQUE INDEX "fms_drivers_license_number_key" ON "fms_drivers"("license_number");
CREATE UNIQUE INDEX "fms_drivers_assigned_truck_id_key" ON "fms_drivers"("assigned_truck_id");
CREATE INDEX "fms_drivers_account_id_idx" ON "fms_drivers"("account_id");

CREATE TABLE "fms_trips" (
  "id" VARCHAR(26) NOT NULL,
  "account_id" VARCHAR(26) NOT NULL,
  "truck_id" VARCHAR(26) NOT NULL,
  "driver_id" VARCHAR(26) NOT NULL,
  "traccar_device_id" INTEGER NOT NULL,
  "origin_name" TEXT NOT NULL,
  "origin_lat" DECIMAL(9,6) NOT NULL,
  "origin_lng" DECIMAL(9,6) NOT NULL,
  "destination_name" TEXT NOT NULL,
  "dest_lat" DECIMAL(9,6) NOT NULL,
  "dest_lng" DECIMAL(9,6) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'STARTED',
  "cargo_description" TEXT,
  "cargo_weight_kg" INTEGER,
  "pre_inspection_id" VARCHAR(26),
  "planned_distance_km" DECIMAL(8,2),
  "actual_distance_km" DECIMAL(8,2),
  "planned_arrival" TIMESTAMP(3),
  "actual_arrival" TIMESTAMP(3),
  "max_speed_kmh" INTEGER,
  "avg_speed_kmh" INTEGER,
  "base_rate_per_km" DECIMAL(8,2) NOT NULL,
  "distance_charges_etb" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "bonus_etb" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "penalty_etb" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total_earnings_etb" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fms_trips_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fms_trips_account_id_idx" ON "fms_trips"("account_id");
CREATE INDEX "fms_trips_driver_id_idx" ON "fms_trips"("driver_id");
CREATE INDEX "fms_trips_status_idx" ON "fms_trips"("status");
CREATE INDEX "fms_trips_started_at_idx" ON "fms_trips"("started_at");

CREATE TABLE "fms_driver_earnings" (
  "id" VARCHAR(26) NOT NULL,
  "driver_id" VARCHAR(26) NOT NULL,
  "trip_id" VARCHAR(26) NOT NULL,
  "distance_km" DECIMAL(8,2) NOT NULL,
  "rate_per_km" DECIMAL(8,2) NOT NULL,
  "base_earning" DECIMAL(12,2) NOT NULL,
  "bonus" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "penalty" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total_earning" DECIMAL(12,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "paid_at" TIMESTAMP(3),
  "payment_ref" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fms_driver_earnings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fms_driver_earnings_trip_id_key" ON "fms_driver_earnings"("trip_id");
CREATE INDEX "fms_driver_earnings_driver_id_idx" ON "fms_driver_earnings"("driver_id");
CREATE INDEX "fms_driver_earnings_status_idx" ON "fms_driver_earnings"("status");

CREATE TABLE "fms_maintenance_records" (
  "id" VARCHAR(26) NOT NULL,
  "account_id" VARCHAR(26) NOT NULL,
  "truck_id" VARCHAR(26) NOT NULL,
  "type" TEXT NOT NULL,
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  "cost_etb" DECIMAL(12,2),
  "mileage_km" INTEGER,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fms_maintenance_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fms_maintenance_records_truck_id_idx" ON "fms_maintenance_records"("truck_id");
CREATE INDEX "fms_maintenance_records_account_id_idx" ON "fms_maintenance_records"("account_id");
CREATE INDEX "fms_maintenance_records_status_idx" ON "fms_maintenance_records"("status");

CREATE TABLE "fms_fuel_logs" (
  "id" VARCHAR(26) NOT NULL,
  "account_id" VARCHAR(26) NOT NULL,
  "truck_id" VARCHAR(26) NOT NULL,
  "driver_id" VARCHAR(26),
  "trip_id" VARCHAR(26),
  "liters" DECIMAL(8,2) NOT NULL,
  "cost_etb" DECIMAL(12,2) NOT NULL,
  "odometer_km" INTEGER NOT NULL,
  "fuel_type" TEXT NOT NULL DEFAULT 'DIESEL',
  "filled_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fms_fuel_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fms_fuel_logs_truck_id_idx" ON "fms_fuel_logs"("truck_id");
CREATE INDEX "fms_fuel_logs_account_id_idx" ON "fms_fuel_logs"("account_id");
CREATE INDEX "fms_fuel_logs_filled_at_idx" ON "fms_fuel_logs"("filled_at");

CREATE TABLE "fms_geofences" (
  "id" VARCHAR(26) NOT NULL,
  "account_id" VARCHAR(26) NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'ALERT',
  "polygon" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fms_geofences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fms_geofences_account_id_idx" ON "fms_geofences"("account_id");

CREATE TABLE "fms_geofence_events" (
  "id" VARCHAR(26) NOT NULL,
  "truck_id" VARCHAR(26) NOT NULL,
  "geofence_id" VARCHAR(26) NOT NULL,
  "event_type" TEXT NOT NULL,
  "lat" DECIMAL(9,6) NOT NULL,
  "lng" DECIMAL(9,6) NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fms_geofence_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fms_geofence_events_truck_id_idx" ON "fms_geofence_events"("truck_id");
CREATE INDEX "fms_geofence_events_geofence_id_idx" ON "fms_geofence_events"("geofence_id");
CREATE INDEX "fms_geofence_events_occurred_at_idx" ON "fms_geofence_events"("occurred_at");

CREATE TABLE "fms_alerts" (
  "id" VARCHAR(26) NOT NULL,
  "account_id" VARCHAR(26) NOT NULL,
  "truck_id" VARCHAR(26),
  "driver_id" VARCHAR(26),
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fms_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fms_alerts_account_id_idx" ON "fms_alerts"("account_id");
CREATE INDEX "fms_alerts_is_read_idx" ON "fms_alerts"("is_read");
CREATE INDEX "fms_alerts_created_at_idx" ON "fms_alerts"("created_at");

CREATE TABLE "fms_inspections" (
  "id" VARCHAR(26) NOT NULL,
  "account_id" VARCHAR(26) NOT NULL,
  "truck_id" VARCHAR(26) NOT NULL,
  "driver_id" VARCHAR(26) NOT NULL,
  "trip_id" VARCHAR(26),
  "type" TEXT NOT NULL,
  "checklist" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fms_inspections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fms_inspections_truck_id_idx" ON "fms_inspections"("truck_id");
CREATE INDEX "fms_inspections_driver_id_idx" ON "fms_inspections"("driver_id");
CREATE INDEX "fms_inspections_account_id_idx" ON "fms_inspections"("account_id");

ALTER TABLE "fms_users"
  ADD CONSTRAINT "fms_users_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "fms_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fms_trucks"
  ADD CONSTRAINT "fms_trucks_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "fms_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fms_drivers"
  ADD CONSTRAINT "fms_drivers_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "fms_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fms_drivers"
  ADD CONSTRAINT "fms_drivers_assigned_truck_id_fkey"
  FOREIGN KEY ("assigned_truck_id") REFERENCES "fms_trucks"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "fms_trips"
  ADD CONSTRAINT "fms_trips_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "fms_accounts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "fms_trips"
  ADD CONSTRAINT "fms_trips_truck_id_fkey"
  FOREIGN KEY ("truck_id") REFERENCES "fms_trucks"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "fms_trips"
  ADD CONSTRAINT "fms_trips_driver_id_fkey"
  FOREIGN KEY ("driver_id") REFERENCES "fms_drivers"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "fms_driver_earnings"
  ADD CONSTRAINT "fms_driver_earnings_driver_id_fkey"
  FOREIGN KEY ("driver_id") REFERENCES "fms_drivers"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "fms_driver_earnings"
  ADD CONSTRAINT "fms_driver_earnings_trip_id_fkey"
  FOREIGN KEY ("trip_id") REFERENCES "fms_trips"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "fms_maintenance_records"
  ADD CONSTRAINT "fms_maintenance_records_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "fms_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fms_maintenance_records"
  ADD CONSTRAINT "fms_maintenance_records_truck_id_fkey"
  FOREIGN KEY ("truck_id") REFERENCES "fms_trucks"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "fms_fuel_logs"
  ADD CONSTRAINT "fms_fuel_logs_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "fms_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fms_fuel_logs"
  ADD CONSTRAINT "fms_fuel_logs_truck_id_fkey"
  FOREIGN KEY ("truck_id") REFERENCES "fms_trucks"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "fms_fuel_logs"
  ADD CONSTRAINT "fms_fuel_logs_driver_id_fkey"
  FOREIGN KEY ("driver_id") REFERENCES "fms_drivers"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "fms_fuel_logs"
  ADD CONSTRAINT "fms_fuel_logs_trip_id_fkey"
  FOREIGN KEY ("trip_id") REFERENCES "fms_trips"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "fms_geofences"
  ADD CONSTRAINT "fms_geofences_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "fms_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fms_geofence_events"
  ADD CONSTRAINT "fms_geofence_events_truck_id_fkey"
  FOREIGN KEY ("truck_id") REFERENCES "fms_trucks"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "fms_geofence_events"
  ADD CONSTRAINT "fms_geofence_events_geofence_id_fkey"
  FOREIGN KEY ("geofence_id") REFERENCES "fms_geofences"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "fms_alerts"
  ADD CONSTRAINT "fms_alerts_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "fms_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fms_inspections"
  ADD CONSTRAINT "fms_inspections_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "fms_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fms_inspections"
  ADD CONSTRAINT "fms_inspections_truck_id_fkey"
  FOREIGN KEY ("truck_id") REFERENCES "fms_trucks"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "fms_inspections"
  ADD CONSTRAINT "fms_inspections_driver_id_fkey"
  FOREIGN KEY ("driver_id") REFERENCES "fms_drivers"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "fms_inspections"
  ADD CONSTRAINT "fms_inspections_trip_id_fkey"
  FOREIGN KEY ("trip_id") REFERENCES "fms_trips"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
