import { Injectable } from '@nestjs/common';
import { SignJWT } from 'jose';
import { JwtKeyProvider } from './jwt-key.provider';

export interface JwtTokenPayload {
  sub?: string;
  scope?: string[];
  role?: string;
  [claim: string]: unknown;
}

@Injectable()
export class JwtTokenService {
  constructor(private readonly config: JwtKeyProvider) {}

  async signAccessToken(
    payload: JwtTokenPayload,
    ttlSeconds?: number,
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const { sub, scope, role, ...rest } = payload;

    const scopeClaim = scope?.length ? scope.join(' ') : undefined;

    const claims: Record<string, unknown> = { ...rest };

    if (role) {
      claims.role = role;
    }

    if (scopeClaim) {
      claims.scope = scopeClaim;
    }

    const token = new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setNotBefore(now)
      .setIssuer(this.config.issuer)
      .setExpirationTime(
        now + (ttlSeconds ?? this.config.accessTokenTtlSeconds),
      );

    if (sub) {
      token.setSubject(sub);
    }

    const privateKey = await this.config.getPrivateKey();
    return token.sign(privateKey);
  }
}
