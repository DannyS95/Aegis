import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtTokenService } from './jwt/jwt-token.service';
import { JwtConfigService } from './jwt/jwt-config.service';
import { AllowedRole, isAllowedRole } from './auth.constants';
import { filterForValidStrings } from '../utils/string-list.util';

export interface IssueTokenRequest {
  subject?: string;
  scope?: string | string[];
  role?: AllowedRole;
  claims?: Record<string, unknown>;
  ttlSeconds?: number;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope?: string[];
  role?: AllowedRole;
}

export interface LoginRequest {
  username?: string;
  password?: string;
  scope?: string | string[];
  role?: AllowedRole;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly jwtConfig: JwtConfigService,
  ) {}

  async issueToken(request: IssueTokenRequest = {}): Promise<TokenResponse> {
    const scopeList = this.normaliseScope(request.scope) ?? ['internal'];
    const role = this.resolveRole(request.role, 'backend');
    const subject = request.subject ?? 'service:local';
    const ttlSeconds =
      request.ttlSeconds ?? this.jwtConfig.accessTokenTtlSeconds;
    const customClaims = this.sanitiseCustomClaims(request.claims);

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
    const role = this.resolveRole(
      request.role,
      request.username ? 'user' : 'backend',
    );

    return this.issueToken({
      subject: tokenSubject,
      scope: request.scope,
      role,
    });
  }

  private normaliseScope(scope?: string | string[]): string[] | undefined {
    if (!scope) {
      return undefined;
    }

    if (Array.isArray(scope)) {
      return filterForValidStrings(scope);
    }

    return filterForValidStrings(scope.split(' '));
  }

  private sanitiseCustomClaims(
    claims?: Record<string, unknown>,
  ): Record<string, unknown> {
    // allow optional custom claims while shielding reserved JWT keys
    const sanitised = { ...(claims ?? {}) };
    delete sanitised.scope;
    delete sanitised.role;
    delete sanitised.sub;
    return sanitised;
  }

  private resolveRole(
    candidate: string | undefined,
    fallback: AllowedRole,
  ): AllowedRole {
    if (candidate === undefined) {
      return fallback;
    }

    if (!isAllowedRole(candidate)) {
      throw new UnauthorizedException(`Role "${candidate}" is not permitted`);
    }

    return candidate;
  }
}
