// Central runtime configuration for the dashboard.
// VITE_API_URL must be set for production builds; we fall back to localhost for local
// dev and fail loudly so a production build never silently points at localhost.

const FALLBACK_API_URL = 'http://localhost:3016/api'

const runtimeEnv = import.meta as ImportMeta & {
  env: {
    VITE_API_URL?: string
    PROD: boolean
  }
}

const env = runtimeEnv.env
const configuredApiUrl = env.VITE_API_URL

function isLocalUrl(value: string): boolean {
  return /localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(value)
}

if (env.PROD) {
  if (!configuredApiUrl) {
    throw new Error('[SMRIT] VITE_API_URL must be set for production builds.')
  }

  let parsed: URL
  try {
    parsed = new URL(configuredApiUrl)
  } catch {
    throw new Error('[SMRIT] VITE_API_URL must be a valid URL in production.')
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('[SMRIT] VITE_API_URL must use HTTPS in production.')
  }

  if (isLocalUrl(parsed.hostname)) {
    throw new Error('[SMRIT] VITE_API_URL must not point at localhost in production.')
  }
}

export const apiBaseUrl = configuredApiUrl ?? FALLBACK_API_URL
export const isUsingFallbackApi = !configuredApiUrl

if (isUsingFallbackApi && env.PROD) {
  // eslint-disable-next-line no-console
  console.warn(
    '[SMRIT] VITE_API_URL is not set - using localhost fallback. Set VITE_API_URL before building for production.',
  )
}
