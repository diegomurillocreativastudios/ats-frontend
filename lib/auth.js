/**
 * Auth helpers for session-based auth using cookies.
 * Backend returns: tokenType, accessToken, expiresIn, refreshToken.
 */

const COOKIE_ACCESS = 'ats_access_token';
const COOKIE_REFRESH = 'ats_refresh_token';
const COOKIE_EXPIRES = 'ats_token_expires';
const COOKIE_USER = 'ats_user';
const COOKIE_PATH = '/';

/** Get a cookie value by name (client-side only). */
export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

/** Get access token from cookie (for API client). */
export const getAccessToken = () => getCookie(COOKIE_ACCESS);

/** Get token expiry timestamp (seconds since epoch). */
export const getTokenExpiresAt = () => {
  const value = getCookie(COOKIE_EXPIRES);
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

/** Check if user has an access token (simple “is logged in” check on client). */
export const hasAuth = () => Boolean(getAccessToken());

/**
 * Get current user from cookie (client-side only).
 * Set by login route when backend returns user, or by /api/auth/me.
 * @returns {{ id, name, email, role? } | null}
 */
export const getCurrentUser = () => {
  const raw = getCookie(COOKIE_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/** Cookie names and path for API routes (server-side). */
export const AUTH_COOKIES = {
  access: COOKIE_ACCESS,
  refresh: COOKIE_REFRESH,
  expires: COOKIE_EXPIRES,
  user: COOKIE_USER,
  path: COOKIE_PATH,
};
