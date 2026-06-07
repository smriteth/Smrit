import fs from 'fs';
import path from 'path';

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const out = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = {
  ...parseEnvFile(path.join(process.cwd(), '.env')),
  ...parseEnvFile(path.join(process.cwd(), '.env.production')),
  ...process.env,
};

const apiUrl = env.VITE_API_URL;
const issues = [];

if (!apiUrl) {
  issues.push('VITE_API_URL is required for production dashboard builds');
} else {
  try {
    const parsed = new URL(apiUrl);
    if (parsed.protocol !== 'https:') {
      issues.push('VITE_API_URL must use HTTPS for production dashboard builds');
    }
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2/i.test(parsed.hostname)) {
      issues.push('VITE_API_URL must not point at localhost for production dashboard builds');
    }
  } catch {
    issues.push('VITE_API_URL must be a valid URL');
  }
}

if (issues.length > 0) {
  console.error('SMRIT dashboard build preflight failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('SMRIT dashboard build preflight passed.');
