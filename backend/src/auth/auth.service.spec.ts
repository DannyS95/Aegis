import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService, TokenResponse, IssueTokenRequest } from './auth.service';
import { JwtTokenService, JwtTokenPayload } from './jwt/services/jwt-token.service';
import { JwtConfigService } from './jwt/services/jwt-config.service';

describe('AuthService', () => {
  const defaultTtl = 3600;
  const defaultInternalScope = ['internal'];
  const jwtTokenService = {
    signAccessToken: jest.fn(),
  } as unknown as JwtTokenService;
  const jwtConfigService = {} as JwtConfigService;
  let service: AuthService;
  const ORIGINAL_ENV = process.env;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };

    Object.defineProperty(jwtConfigService, 'accessTokenTtlSeconds', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: defaultTtl,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtTokenService,
          useValue: jwtTokenService,
        },
        {
          provide: JwtConfigService,
          useValue: jwtConfigService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  const mockIssueAccessToken = (result: string) => {
    (jwtTokenService.signAccessToken as jest.Mock).mockResolvedValue(result);
  };

  const expectIssueAccessTokenToHaveBeenCalledWith = (
    payloadMatcher: Partial<JwtTokenPayload>,
    ttl = defaultTtl,
  ) => {
    expect(jwtTokenService.signAccessToken).toHaveBeenCalledTimes(1);

    const [payloadArg, ttlArg] = (
      jwtTokenService.signAccessToken as jest.Mock
    ).mock.calls[0] as [JwtTokenPayload, number];

    expect(payloadArg).toEqual(expect.objectContaining(payloadMatcher));
    expect(ttlArg).toBe(ttl);
  };

  describe('issueToken', () => {
    it('returns a defaulted TokenResponse while preserving custom claims', async () => {
      mockIssueAccessToken('signed-token');
      const fallbackServiceSubject = 'service:local';

      const expectedDefaultTokenResponse: TokenResponse = {
        accessToken: 'signed-token',
        tokenType: 'Bearer',
        expiresIn: defaultTtl,
        scope: defaultInternalScope,
        role: 'backend',
      };

      const requestWithCustomClaims: IssueTokenRequest = {
        claims: {
          foo: 'bar',
          scope: 'ignored',
          role: 'ignored',
          sub: 'ignored',
        },
      };

      const response = await service.issueToken(requestWithCustomClaims);

      expect(response).toEqual(expectedDefaultTokenResponse);

      const expectedAccessTokenPayloadAfterSanitisation: JwtTokenPayload = {
        sub: fallbackServiceSubject,
        scope: defaultInternalScope,
        role: 'backend',
        foo: 'bar',
      };

      expectIssueAccessTokenToHaveBeenCalledWith(
        expectedAccessTokenPayloadAfterSanitisation,
      );
    });

    it('honours provided subject, scope, role, and TTL overrides', async () => {
      mockIssueAccessToken('custom-token');
      const expectedUserTokenPayload: JwtTokenPayload = {
        sub: 'user:demo',
        scope: ['read', 'write'],
        role: 'user',
      };

      await service.issueToken({
        subject: 'user:demo',
        scope: [' read ', 'write', ''],
        role: 'user',
        ttlSeconds: 1800,
      });

      expectIssueAccessTokenToHaveBeenCalledWith(
        expectedUserTokenPayload,
        1800,
      );
    });

    it('rejects TTL overrides above the configured default', async () => {
      await expect(
        service.issueToken({ ttlSeconds: defaultTtl + 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(jwtTokenService.signAccessToken).not.toHaveBeenCalled();
    });

    it('rejects non-positive TTL overrides', async () => {
      await expect(
        service.issueToken({ ttlSeconds: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.issueToken({ ttlSeconds: -100 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(jwtTokenService.signAccessToken).not.toHaveBeenCalled();
    });

    it('rejects roles outside the allowlist', async () => {
      await expect(
        service.issueToken({ role: 'admin' as never }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('login', () => {
    const tokenResponse: TokenResponse = {
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresIn: defaultTtl,
      scope: defaultInternalScope,
      role: 'backend',
    };

    beforeEach(() => {
      jest.spyOn(service, 'issueToken').mockResolvedValue(tokenResponse);
    });

    afterEach(() => {
      (service.issueToken as jest.Mock).mockRestore();
      delete process.env.LOCAL_AUTH_USERNAME;
      delete process.env.LOCAL_AUTH_PASSWORD;
      delete process.env.LOCAL_AUTH_DEFAULT_SUBJECT;
    });

    it('proves login rejects mismatched configured credentials', async () => {
      process.env.LOCAL_AUTH_USERNAME = 'user';
      process.env.LOCAL_AUTH_PASSWORD = 'secret';

      await expect(
        service.login({ username: 'user', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(service.issueToken).not.toHaveBeenCalled();
    });

    it('proves login derives subject and applies allowed role when username provided', async () => {
      process.env.LOCAL_AUTH_USERNAME = 'admin';
      process.env.LOCAL_AUTH_PASSWORD = 'change-me';
      (service.issueToken as jest.Mock).mockResolvedValue({
        ...tokenResponse,
        role: 'user',
      });

      await service.login({
        username: 'admin',
        password: 'change-me',
      });

      expect(service.issueToken).toHaveBeenCalledWith({
        subject: 'user:admin',
        role: 'user',
      });
    });

    it('proves login rejects requests without a username', async () => {
      await expect(service.login({})).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(service.issueToken).not.toHaveBeenCalled();
    });
  });
});
