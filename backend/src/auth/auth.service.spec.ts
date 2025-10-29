import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService, TokenResponse, IssueTokenRequest } from './auth.service';
import { JwtTokenService, JwtTokenPayload } from './jwt/services/jwt-token.service';
import { JwtConfigService } from './jwt/services/jwt-config.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  const defaultTtl = 3600;
  const defaultInternalScope = ['internal'];
  const jwtTokenService = {
    signAccessToken: jest.fn(),
  } as unknown as JwtTokenService;
  const jwtConfigService = {} as JwtConfigService;
  const prismaService = {
    user: {
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;
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
        {
          provide: PrismaService,
          useValue: prismaService,
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
      (prismaService.user.findFirst as jest.Mock).mockReset();
    });

    afterEach(() => {
      (service.issueToken as jest.Mock).mockRestore();
    });

    it('requires either username or email', async () => {
      await expect(service.login({})).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prismaService.user.findFirst).not.toHaveBeenCalled();
      expect(service.issueToken).not.toHaveBeenCalled();
    });

    it('rejects when no matching user is found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ username: 'missing-user' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(service.issueToken).not.toHaveBeenCalled();
    });

    it('issues a token using the located users identifier', async () => {
      const user = {
        id: 'user-123',
        username: 'alice',
        email: 'alice@example.com',
        avatarUrl: 'https://example.com/alice.png',
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(user);

      await service.login({ username: 'alice' });

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { username: 'alice' },
      });
      expect(service.issueToken).toHaveBeenCalledWith({
        subject: user.id,
        role: 'user',
        claims: {
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
        },
      });
    });

    it('supports logging in with an email address', async () => {
      const user = {
        id: 'user-456',
        username: 'bob',
        email: 'bob@example.com',
        avatarUrl: null,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(user);

      await service.login({ email: 'bob@example.com' });

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'bob@example.com' },
      });
      expect(service.issueToken).toHaveBeenCalledWith({
        subject: user.id,
        role: 'user',
        claims: {
          username: user.username,
          email: user.email,
        },
      });
    });
  });
});
