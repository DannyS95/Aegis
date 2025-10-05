import { Injectable } from '@nestjs/common';
import { importPKCS8, importSPKI } from 'jose';

@Injectable()
export class JwtConfigService {
  readonly issuer: string;
  readonly audience: string;
  readonly accessTokenTtlSeconds: number;
  private readonly privateKeyPromise: Promise<
    Awaited<ReturnType<typeof importPKCS8>>
  >;
  private readonly publicKeyPromise: Promise<
    Awaited<ReturnType<typeof importSPKI>>
  >;

  constructor() {
    const privateKeyPem = this.readEnv('JWT_PRIVATE_KEY');
    const publicKeyPem = this.readEnv('JWT_PUBLIC_KEY');
    this.privateKeyPromise = importPKCS8(privateKeyPem, 'RS256');
    this.publicKeyPromise = importSPKI(publicKeyPem, 'RS256');
    this.issuer = process.env.JWT_ISSUER ?? 'aegis-backend';
    this.audience = process.env.JWT_AUDIENCE ?? 'aegis-api';
    const ttl = Number(process.env.JWT_ACCESS_TOKEN_TTL ?? '3600');

    if (!Number.isFinite(ttl) || ttl <= 0) {
      throw new Error(
        'Environment variable JWT_ACCESS_TOKEN_TTL must be a positive number.',
      );
    }

    this.accessTokenTtlSeconds = ttl;
  }

  getPrivateKey(): Promise<Awaited<ReturnType<typeof importPKCS8>>> {
    return this.privateKeyPromise;
  }

  getPublicKey(): Promise<Awaited<ReturnType<typeof importSPKI>>> {
    return this.publicKeyPromise;
  }

  private readEnv(key: 'JWT_PRIVATE_KEY' | 'JWT_PUBLIC_KEY'): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Environment variable ${key} must be set.`);
    }

    const normalised = value.includes('\n')
      ? value.replace(/\\n/g, '\n')
      : value;
    return normalised;
  }
}
