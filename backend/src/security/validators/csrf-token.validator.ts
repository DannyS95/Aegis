import { ForbiddenException } from '@nestjs/common';

export function isValidCsrfTokenValue(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function assertValidCsrfHeader(value: unknown): asserts value is string {
  if (!isValidCsrfTokenValue(value)) {
    throw new ForbiddenException('Invalid CSRF token');
  }
}
