const trim = (v: string | undefined) => (v ?? '').replace(/\/+$/, '');

/** API origin without a trailing slash. */
export const API_BASE_URL = trim(import.meta.env.VITE_API_BASE_URL as string | undefined);
/** Optional URL of the main app (for the "Open the app" link). */
export const APP_URL = trim(import.meta.env.VITE_APP_URL as string | undefined);

if (import.meta.env.PROD && !API_BASE_URL) {
  // eslint-disable-next-line no-console
  console.error('VITE_API_BASE_URL is not set: API calls will go to this site\'s own origin.');
}
