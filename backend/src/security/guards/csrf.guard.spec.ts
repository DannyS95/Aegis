import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  const contextFor = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  it('allows safe methods without csrf checks', () => {
    const request = {
      method: 'GET',
      path: '/conversations',
      cookies: {},
      headers: {},
    };

    expect(guard.canActivate(contextFor(request))).toBe(true);
  });

  it('allows login without csrf checks', () => {
    const request = {
      method: 'POST',
      path: '/auth/login',
      cookies: {},
      headers: {},
    };

    expect(guard.canActivate(contextFor(request))).toBe(true);
  });

  it('rejects unsafe authenticated requests with missing csrf header', () => {
    const request = {
      method: 'POST',
      path: '/conversations',
      cookies: {
        aegis_auth: 'jwt',
        aegis_csrf: 'csrf-token',
      },
      headers: {},
    };

    expect(() => guard.canActivate(contextFor(request))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects unsafe authenticated requests with non-string csrf header', () => {
    const request = {
      method: 'POST',
      path: '/conversations',
      cookies: {
        aegis_auth: 'jwt',
        aegis_csrf: 'csrf-token',
      },
      headers: {
        'x-csrf-token': ['csrf-token'],
      },
    };

    expect(() => guard.canActivate(contextFor(request))).toThrow(
      ForbiddenException,
    );
  });

  it('allows unsafe authenticated requests with matching csrf token', () => {
    const request = {
      method: 'POST',
      path: '/conversations',
      cookies: {
        aegis_auth: 'jwt',
        aegis_csrf: 'csrf-token',
      },
      headers: {
        'x-csrf-token': 'csrf-token',
      },
    };

    expect(guard.canActivate(contextFor(request))).toBe(true);
  });
});
