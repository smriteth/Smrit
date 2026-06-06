-- Create Traccar database (smrit_fms already created by POSTGRES_DB env var)
CREATE DATABASE traccar_gps;

-- Create Traccar user with access only to traccar_gps
CREATE USER traccar_user WITH PASSWORD 'traccar_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE traccar_gps TO traccar_user;

\c traccar_gps
GRANT ALL ON SCHEMA public TO traccar_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO traccar_user;

-- Grant read-only access to smrit analytics (optional, for analytics engine later)
\c smrit_fms
GRANT CONNECT ON DATABASE traccar_gps TO smrit_user;
