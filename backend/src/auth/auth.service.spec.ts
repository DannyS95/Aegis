import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService, TokenResponse } from './auth.service';
import { JwtTokenService, AccessTokenPayload } from './jwt/services/jwt-token.service';
import { JwtConfigService } from './jwt/services/jwt-config.service';

describe('AuthService', () => {
  const defaultTtl = 3600;
  const jwtTokenService = {
    issueAccessToken: jest.fn(),
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
    (jwtTokenService.issueAccessToken as jest.Mock).mockResolvedValue(result);
  };

  const expectIssueAccessTokenCalledWith = (
    payloadMatcher: Partial<AccessTokenPayload>,
    ttl = defaultTtl,
  ) => {
    expect(jwtTokenService.issueAccessToken).toHaveBeenCalledTimes(1);

    const [payloadArg, ttlArg] = (
      jwtTokenService.issueAccessToken as jest.Mock
    ).mock.calls[0] as [AccessTokenPayload, number];

    expect(payloadArg).toEqual(expect.objectContaining(payloadMatcher));
    expect(ttlArg).toBe(ttl);
  };

  describe('issueToken', () => {
    it('proves issueToken returns sanitised defaults for JWT responses', async () => {
      mockIssueAccessToken('signed-token');
      const response = await service.issueToken({
        claims: { foo: 'bar', scope: 'ignored', role: 'ignored', sub: 'ignored' },
      });

      expect(response).toEqual<TokenResponse>({
        accessToken: 'signed-token',
        tokenType: 'Bearer',
        expiresIn: defaultTtl,
        scope: ['internal'],
        role: 'backend',
      });

      expectIssueAccessTokenCalledWith({
        sub: 'service:local',
        scope: ['internal'],
        role: 'backend',
        foo: 'bar',
      });
    });

    it('proves issueToken normalises scopes and honours allowed roles', async () => {
      mockIssueAccessToken('custom-token');
      await service.issueToken({
        subject: 'user:demo',
        scope: [' read ', 'write', ''],
        role: 'user',
        ttlSeconds: 1800,
      });

      expectIssueAccessTokenCalledWith(
        {
          sub: 'user:demo',
          scope: ['read', 'write'],
          role: 'user',
        },
        1800,
      );
    });

    it('proves issueToken rejects TTL values above the configured default', async () => {
      await expect(
        service.issueToken({ ttlSeconds: defaultTtl + 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(jwtTokenService.issueAccessToken).not.toHaveBeenCalled();
    });

    it('proves issueToken rejects non-positive TTL values', async () => {
      await expect(
        service.issueToken({ ttlSeconds: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.issueToken({ ttlSeconds: -100 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(jwtTokenService.issueAccessToken).not.toHaveBeenCalled();
    });

    it('proves issueToken blocks tokens when the role is not allowlisted', async () => {
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
      scope: ['internal'],
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
        scope: 'custom',
      });

      expect(service.issueToken).toHaveBeenCalledWith({
        subject: 'user:admin',
        scope: 'custom',
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
