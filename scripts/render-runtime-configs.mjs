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

const fileEnv = parseEnvFile(path.join(repoRoot, '.env'));
const env = { ...fileEnv, ...process.env };

function required(name, fallback = '') {
  const value = env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isPlaceholder(value) {
  return /<[^>]+>|CHANGE_ME|change_me|password_123|secret_123|example\.com/i.test(value);
}

function isLocalUrl(value) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2/i.test(value);
}

function validateProductionEnv() {
  if (env.NODE_ENV !== 'production') return;

  const requiredNames = [
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
      issues.push(`${name} still contains a placeholder or sample value`);
    }
  }

  for (const name of ['TRACCAR_OSMAND_ENDPOINT', 'CORS_ORIGIN', 'VITE_API_URL']) {
    const value = env[name];
    if (value && !value.startsWith('https://')) {
      issues.push(`${name} must use HTTPS in production`);
    }
    if (value && isLocalUrl(value)) {
      issues.push(`${name} must not point at localhost in production`);
    }
  }

  if (env.CORS_ORIGIN === '*') {
    issues.push('CORS_ORIGIN must be a specific dashboard origin in production');
  }

  if (env.JWT_SECRET && env.JWT_SECRET.length < 64) {
    issues.push('JWT_SECRET must be at least 64 characters in production');
  }

  if (issues.length > 0) {
    throw new Error(`Invalid production environment:\n- ${issues.join('\n- ')}`);
  }
}

function render(template, replacements) {
  let output = template;
  for (const [token, value] of Object.entries(replacements)) {
    output = output.split(token).join(value);
  }
  return output;
}

const traccarTemplatePath = path.join(repoRoot, 'traccar', 'conf', 'traccar.template.xml');
const postgresTemplatePath = path.join(repoRoot, 'postgres', 'init.sql.template');
const traccarGeneratedPath = path.join(repoRoot, 'traccar', 'conf', 'generated', 'traccar.xml');
const postgresGeneratedPath = path.join(repoRoot, 'postgres', 'generated', 'init.sql');

const traccarTemplate = fs.readFileSync(traccarTemplatePath, 'utf8');
const postgresTemplate = fs.readFileSync(postgresTemplatePath, 'utf8');

validateProductionEnv();

const replacements = {
  __TRACCAR_DB_HOST__: env.TRACCAR_DB_HOST ?? 'postgres',
  __TRACCAR_DB_PORT__: env.TRACCAR_DB_PORT ?? '5432',
  __TRACCAR_DB_NAME__: env.TRACCAR_DB_NAME ?? 'traccar_gps',
  __TRACCAR_DB_USER__: required('TRACCAR_DB_USER', 'traccar_user'),
  __TRACCAR_DB_PASSWORD__: required('TRACCAR_DB_PASSWORD'),
  __SMRIT_DB_NAME__: env.POSTGRES_DB ?? 'smrit_fms',
  __SMRIT_DB_USER__: env.POSTGRES_USER ?? 'smrit_user',
};

fs.mkdirSync(path.dirname(traccarGeneratedPath), { recursive: true });
fs.mkdirSync(path.dirname(postgresGeneratedPath), { recursive: true });

fs.writeFileSync(traccarGeneratedPath, render(traccarTemplate, replacements), 'utf8');
fs.writeFileSync(postgresGeneratedPath, render(postgresTemplate, replacements), 'utf8');

console.log(`Rendered ${path.relative(repoRoot, traccarGeneratedPath)}`);
console.log(`Rendered ${path.relative(repoRoot, postgresGeneratedPath)}`);
