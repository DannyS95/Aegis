import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtTokenService } from './jwt/jwt-token.service';
import { JwtConfigService } from './jwt/jwt-config.service';

export interface IssueTokenRequest {
  subject?: string;
  scope?: string | string[];
  role?: string;
  claims?: Record<string, unknown>;
  ttlSeconds?: number;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope?: string[];
  role?: string;
}

export interface LoginRequest {
  username?: string;
  password?: string;
  scope?: string | string[];
  role?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly jwtConfig: JwtConfigService,
  ) {}

  async issueToken(request: IssueTokenRequest = {}): Promise<TokenResponse> {
    const scopeList = this.normaliseScope(request.scope) ?? ['internal'];
    const role = request.role ?? 'backend';
    const subject = request.subject ?? 'service:local';
    const ttlSeconds =
      request.ttlSeconds ?? this.jwtConfig.accessTokenTtlSeconds;

    const customClaims = { ...(request.claims ?? {}) };
    delete (customClaims as Record<string, unknown>).scope;
    delete (customClaims as Record<string, unknown>).role;
    delete (customClaims as Record<string, unknown>).sub;

    const accessToken = await this.jwtTokenService.issueAccessToken(
      {
        sub: subject,
        scope: scopeList,
        role,
        ...customClaims,
      },
      ttlSeconds,
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: ttlSeconds,
      scope: scopeList,
      role,
    };
  }

  async login(request: LoginRequest = {}): Promise<TokenResponse> {
    const expectedUsername = process.env.LOCAL_AUTH_USERNAME;
    const expectedPassword = process.env.LOCAL_AUTH_PASSWORD;

    if (expectedUsername && expectedPassword) {
      if (
        request.username !== expectedUsername ||
        request.password !== expectedPassword
      ) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    const tokenSubject = request.username
      ? `user:${request.username}`
      : (process.env.LOCAL_AUTH_DEFAULT_SUBJECT ?? 'service:local');

    return this.issueToken({
      subject: tokenSubject,
      scope: request.scope,
      role: request.role ?? (request.username ? 'user' : 'backend'),
    });
  }

  private normaliseScope(scope?: string | string[]): string[] | undefined {
    if (!scope) {
      return undefined;
    }

    if (Array.isArray(scope)) {
      return scope.map((value) => value.trim()).filter(Boolean);
    }

    return scope
      .split(' ')
      .map((value) => value.trim())
      .filter(Boolean);
  }
}
