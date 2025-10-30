import { Injectable } from '@nestjs/common';

type JoseModule = typeof import('jose');
type ImportedPrivateKey = Awaited<ReturnType<JoseModule['importPKCS8']>>;
type ImportedPublicKey = Awaited<ReturnType<JoseModule['importSPKI']>>;

@Injectable()
export class JwtKeyProvider {
  readonly issuer: string;
  readonly accessTokenTtlSeconds: number;
  private readonly josePromise: Promise<JoseModule>;
  private readonly privateKeyPromise: Promise<ImportedPrivateKey>;
  private readonly publicKeyPromise: Promise<ImportedPublicKey>;

  constructor() {
    const privateKeyPem = this.readEnv('JWT_PRIVATE_KEY');
    const publicKeyPem = this.readEnv('JWT_PUBLIC_KEY');
    this.josePromise = import('jose');
    const joseInitialiser = this.josePromise;
    this.privateKeyPromise = joseInitialiser.then(({ importPKCS8 }) =>
      importPKCS8(privateKeyPem, 'RS256'),
    );
    this.publicKeyPromise = joseInitialiser.then(({ importSPKI }) =>
      importSPKI(publicKeyPem, 'RS256'),
    );
    this.issuer = process.env.JWT_ISSUER ?? 'aegis-backend';
    const ttl = Number(process.env.JWT_ACCESS_TOKEN_TTL ?? '3600');

    if (!Number.isFinite(ttl) || ttl <= 0) {
      throw new Error(
        'Environment variable JWT_ACCESS_TOKEN_TTL must be a positive number.',
      );
    }

    this.accessTokenTtlSeconds = ttl;
  }

  getPrivateKey(): Promise<ImportedPrivateKey> {
    return this.privateKeyPromise;
  }

  getPublicKey(): Promise<ImportedPublicKey> {
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
