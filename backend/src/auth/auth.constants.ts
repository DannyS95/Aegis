export const ALLOWED_ROLES = ['backend', 'user'] as const;

export type AllowedRole = (typeof ALLOWED_ROLES)[number];

export function isAllowedRole(value: unknown): value is AllowedRole {
  return typeof value === 'string' && ALLOWED_ROLES.includes(value as AllowedRole);
}
