import type { CookieOptions } from 'express';

export const AUTH_COOKIE_NAME = 'aegis_auth';
export const CSRF_HEADER_NAME = 'x-csrf-token';
export const CSRF_COOKIE_NAME = 'aegis_csrf';

type CookieSameSite = 'strict' | 'lax' | 'none';

function parseSameSite(value?: string): CookieSameSite {
  const normalised = value?.trim().toLowerCase();

  if (
    normalised === 'strict' ||
    normalised === 'lax' ||
    normalised === 'none'
  ) {
    return normalised;
  }

  return process.env.NODE_ENV === 'production' ? 'strict' : 'lax';
}

function parseSecure(value?: string): boolean {
  if (!value) {
    return process.env.NODE_ENV === 'production';
  }

  return value.trim().toLowerCase() === 'true';
}

export function resolveCookieOptions(): Pick<
  CookieOptions,
  'secure' | 'sameSite' | 'path'
> {
  return {
    secure: parseSecure(process.env.AUTH_COOKIE_SECURE),
    sameSite: parseSameSite(process.env.AUTH_COOKIE_SAMESITE),
    path: '/',
  };
}
