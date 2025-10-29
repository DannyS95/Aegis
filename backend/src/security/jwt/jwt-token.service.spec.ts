import { generateKeyPair, jwtVerify } from 'jose';
import { JwtTokenService } from './jwt-token.service';
import { JwtKeyProvider } from './jwt-key.provider';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  type KeyPair = Awaited<ReturnType<typeof generateKeyPair>>;
  let privateKey: KeyPair['privateKey'];
  let publicKey: KeyPair['publicKey'];
  const issuer = 'test-issuer';
  const defaultTtl = 3600;

  beforeAll(async () => {
    const keyPair = await generateKeyPair('RS256');
    privateKey = keyPair.privateKey;
    publicKey = keyPair.publicKey;

    const config = {
      issuer,
      accessTokenTtlSeconds: defaultTtl,
      getPrivateKey: jest.fn(async () => privateKey),
      getPublicKey: jest.fn(async () => publicKey),
    } as unknown as JwtKeyProvider;

    service = new JwtTokenService(config);
  });

  it('signs tokens that include subject, scope, role, and custom claims', async () => {
    const token = await service.signAccessToken(
      {
        sub: 'user:42',
        scope: ['read', 'write'],
        role: 'user',
        feature: 'alpha',
      },
      1200,
    );

    const verification = await jwtVerify(token, publicKey, {
      issuer,
    });

    expect(verification.payload.sub).toBe('user:42');
    expect(verification.payload.scope).toBe('read write');
    expect(verification.payload.role).toBe('user');
    expect(verification.payload.feature).toBe('alpha');
    expect(
      Number(verification.payload.exp) - Number(verification.payload.iat),
    ).toBe(1200);
  });

  it('omits absent optional claims and falls back to the configured TTL', async () => {
    const token = await service.signAccessToken({ feature: 'beta' });
    const verification = await jwtVerify(token, publicKey, {
      issuer,
    });

    expect(verification.payload.sub).toBeUndefined();
    expect(verification.payload.scope).toBeUndefined();
    expect(verification.payload.role).toBeUndefined();
    expect(verification.payload.feature).toBe('beta');
    expect(
      Number(verification.payload.exp) - Number(verification.payload.iat),
    ).toBe(defaultTtl);
  });
});
