import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AllowedRole, isAllowedRole } from './constants/auth.constants';
import { JwtKeyProvider } from '../security/jwt/jwt-key.provider';
import { JwtTokenService } from '../security/jwt/jwt-token.service';
import { filterForValidStrings } from '../utils/string-list.util';
import { PrismaService } from '../prisma/prisma.service';

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
  email?: string;
  password?: string;
  scope?: string | string[];
  role?: AllowedRole;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly tokenService: JwtTokenService,
    private readonly tokenConfigService: JwtKeyProvider,
    private readonly prisma: PrismaService,
  ) {}

  async issueToken(request: IssueTokenRequest = {}): Promise<TokenResponse> {
    const scopeList = this.normaliseScope(request.scope) ?? ['internal'];
    const role = this.resolveRole(request.role, 'backend');
    const subject = request.subject ?? 'service:local';
    const ttlSeconds = this.resolveTtlSeconds(request.ttlSeconds);
    const customClaims = this.sanitiseCustomClaims(request.claims);

    const accessToken = await this.tokenService.signAccessToken(
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
    const { username, email } = this.resolveLoginIdentity(
      request.username,
      request.email,
    );

    const where =
      username && email
        ? { OR: [{ username }, { email }] }
        : username
          ? { username }
          : { email: email! };

    const user = await this.prisma.user.findFirst({ where });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokenSubject = user.id;
    const resolvedRole = this.resolveRole(
      request.role ?? (user.role as string | undefined),
      'user',
    );

    return this.issueToken({
      subject: tokenSubject,
      scope: request.scope,
      role: resolvedRole,
      claims: {
        username: user.username,
        email: user.email,
        ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
      },
    });
  }

  private normaliseScope(scope?: string | string[]): string[] | undefined {
    if (!scope) {
      return undefined;
    }

    if (Array.isArray(scope)) {
      const values = filterForValidStrings(scope);
      return values.length ? values : undefined;
    }

    const values = filterForValidStrings(scope.split(' '));
    return values.length ? values : undefined;
  }

  private resolveLoginIdentity(
    username?: string,
    email?: string,
  ): { username?: string; email?: string } {
    const normalisedUsername = username?.trim();
    const normalisedEmail = email?.trim().toLowerCase();

    if (!normalisedUsername && !normalisedEmail) {
      throw new UnauthorizedException(
        'Either username or email is required to login',
      );
    }

    return {
      username: normalisedUsername || undefined,
      email: normalisedEmail || undefined,
    };
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

  private resolveTtlSeconds(requested?: number): number {
    const defaultTtl = this.tokenConfigService.accessTokenTtlSeconds;

    if (requested === undefined) {
      return defaultTtl;
    }

    if (!Number.isFinite(requested) || requested <= 0) {
      throw new BadRequestException('TTL must be a positive number');
    }

    const rounded = Math.floor(requested);

    if (rounded > defaultTtl) {
      throw new BadRequestException(`TTL may not exceed ${defaultTtl} seconds`);
    }

    return rounded;
  }
}
