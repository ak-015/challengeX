const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

/** API origin without a trailing slash. Empty string = same origin (useful behind a proxy). */
export const API_BASE_URL = raw.replace(/\/+$/, '');

if (import.meta.env.PROD && !API_BASE_URL) {
  // eslint-disable-next-line no-console
  console.error('VITE_API_BASE_URL is not set: API calls will go to this site\'s own origin.');
}
