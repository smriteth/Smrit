import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const out = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const normalized = line.startsWith('export ') ? line.slice(7) : line;
    const eqIndex = normalized.indexOf('=');
    if (eqIndex === -1) continue;

    const key = normalized.slice(0, eqIndex).trim();
    let value = normalized.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = { ...parseEnvFile(path.join(repoRoot, '.env')), ...process.env };

function isPlaceholder(value) {
  return /<[^>]+>|CHANGE_ME|change_me|password_123|secret_123|example\.com|your-domain/i.test(value);
}

function isLocalUrl(value) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2/i.test(value);
}

const requiredNames = [
  'NODE_ENV',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'REDIS_PASSWORD',
  'TRACCAR_DB_USER',
  'TRACCAR_DB_PASSWORD',
  'TRACCAR_ADMIN_EMAIL',
  'TRACCAR_ADMIN_PASSWORD',
  'TRACCAR_OSMAND_ENDPOINT',
  'JWT_SECRET',
  'CORS_ORIGIN',
  'VITE_API_URL',
];

const issues = [];

for (const name of requiredNames) {
  const value = env[name];
  if (!value) {
    issues.push(`${name} is required`);
  } else if (isPlaceholder(value)) {
    issues.push(`${name} contains a placeholder or sample value`);
  }
}

if (env.NODE_ENV !== 'production') {
  issues.push('NODE_ENV must be production');
}

for (const name of ['TRACCAR_OSMAND_ENDPOINT', 'CORS_ORIGIN', 'VITE_API_URL']) {
  const value = env[name];
  if (value && !value.startsWith('https://')) {
    issues.push(`${name} must use HTTPS`);
  }
  if (value && isLocalUrl(value)) {
    issues.push(`${name} must not point at localhost`);
  }
}

if (env.CORS_ORIGIN === '*') {
  issues.push('CORS_ORIGIN must be a specific dashboard origin');
}

if (env.JWT_SECRET && env.JWT_SECRET.length < 64) {
  issues.push('JWT_SECRET must be at least 64 characters');
}

if (issues.length > 0) {
  console.error('SMRIT production preflight failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('SMRIT production preflight passed.');
