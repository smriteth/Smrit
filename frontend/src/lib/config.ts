// Central runtime configuration for the dashboard.
// VITE_API_URL must be set for production builds; we fall back to localhost for local
// dev and warn loudly so a prod build never silently points at localhost.

const FALLBACK_API_URL = 'http://localhost:3016/api'

const env = (import.meta as any).env ?? {}
const configuredApiUrl = env.VITE_API_URL as string | undefined

export const apiBaseUrl = configuredApiUrl ?? FALLBACK_API_URL
export const isUsingFallbackApi = !configuredApiUrl

if (isUsingFallbackApi && env.PROD) {
  // eslint-disable-next-line no-console
  console.warn(
    '[SMRIT] VITE_API_URL is not set — using localhost fallback. Set VITE_API_URL before building for production.',
  )
}
