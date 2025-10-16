import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { generateKeyPair, SignJWT } from 'jose';
import { JwtAuthGuard, AuthenticatedRequest } from './jwt-auth.guard';
import { JwtConfigService } from '../../jwt/services/jwt-config.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  type KeyPair = Awaited<ReturnType<typeof generateKeyPair>>;
  let privateKey: KeyPair['privateKey'];
  let publicKey: KeyPair['publicKey'];
  const issuer = 'test-issuer';
  const audience = 'test-audience';

  const createContext = (request: Partial<AuthenticatedRequest>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeAll(async () => {
    const keyPair = await generateKeyPair('RS256');
    privateKey = keyPair.privateKey;
    publicKey = keyPair.publicKey;

    const config = {
      issuer,
      audience,
      getPublicKey: jest.fn(async () => publicKey),
    } as unknown as JwtConfigService;

    guard = new JwtAuthGuard(config);
  });

  const signToken = async (payload: Record<string, unknown>) =>
    new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject('user:123')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

  it('proves the guard accepts a valid token and attaches the authenticated user', async () => {
    const token = await signToken({
      scope: 'read write',
      role: 'user',
      feature: 'alpha',
    });

    const request: AuthenticatedRequest = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as AuthenticatedRequest;

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'user:123',
      role: 'user',
      scope: ['read', 'write'],
      claims: expect.objectContaining({ feature: 'alpha' }),
    });
  });

  it('proves the guard rejects requests without an authorization header', async () => {
    const request = { headers: {} } as AuthenticatedRequest;

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('proves the guard rejects requests with invalid tokens', async () => {
    const request = {
      headers: { authorization: 'Bearer invalid.token.value' },
    } as AuthenticatedRequest;

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
