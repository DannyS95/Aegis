import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { jwtVerify } from 'jose';
import { JwtKeyProvider } from '../jwt/jwt-key.provider';

export interface AuthenticatedUser {
  id: string;
  role?: string;
  scope?: string[];
  claims: Record<string, unknown>;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: JwtKeyProvider) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    try {
      const publicKey = await this.config.getPublicKey();
      const { payload } = await jwtVerify(token, publicKey, {
        issuer: this.config.issuer,
      });

      if (typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Token subject must be a string');
      }

      const scopeClaim =
        typeof payload.scope === 'string'
          ? payload.scope.split(' ')
          : undefined;
      const roleClaim =
        typeof payload.role === 'string' ? payload.role : undefined;

      const claims = Object.fromEntries(
        Object.entries(payload).filter(
          ([key]) => key !== 'sub' && key !== 'scope' && key !== 'role',
        ),
      );

      request.user = {
        id: payload.sub,
        role: roleClaim,
        scope: scopeClaim,
        claims,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException({
        message: 'Invalid or expired token',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private extractBearerToken(request: Request): string {
    const header = request.headers.authorization;
    if (!header) {
      throw new UnauthorizedException('Authorization header required');
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Authorization header must be a Bearer token',
      );
    }

    return token;
  }
}
