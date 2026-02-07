import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '../../auth/constants/auth-cookie.constants';
import {
  assertValidCsrfHeader,
  isValidCsrfTokenValue,
} from '../validators/csrf-token.validator';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SKIPPED_PATHS = new Set(['/auth/login', '/auth/token', '/auth/logout']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!UNSAFE_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    if (SKIPPED_PATHS.has(request.path)) {
      return true;
    }

    const authCookie = request.cookies?.[AUTH_COOKIE_NAME];
    if (!authCookie || typeof authCookie !== 'string') {
      return true;
    }

    const csrfCookie = request.cookies?.[CSRF_COOKIE_NAME];
    const csrfHeader = request.headers[CSRF_HEADER_NAME];
    assertValidCsrfHeader(csrfHeader);

    if (!isValidCsrfTokenValue(csrfCookie) || csrfCookie !== csrfHeader) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}
