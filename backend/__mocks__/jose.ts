import { Buffer } from 'buffer';

type Payload = Record<string, unknown>;

const decodeToken = (token: string): { header: Payload; payload: Payload } => {
  const json = Buffer.from(token, 'base64url').toString('utf8');
  return JSON.parse(json);
};

const encodeToken = (data: { header: Payload; payload: Payload }) =>
  Buffer.from(JSON.stringify(data)).toString('base64url');

const resolveExpiration = (
  value: number | string | undefined,
  issuedAt: number,
): number | string | undefined => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const hoursMatch = value.match(/^(\d+)h$/);
    if (hoursMatch) {
      return issuedAt + Number(hoursMatch[1]) * 3600;
    }
  }

  return value;
};

export class SignJWT {
  private readonly payload: Payload;
  private header: Payload = {};
  private issuer?: string;
  private audience?: string | string[];
  private subject?: string;
  private issuedAt?: number;
  private notBefore?: number;
  private expirationTime?: number | string;

  constructor(payload: Payload) {
    this.payload = { ...payload };
  }

  setProtectedHeader(header: Payload) {
    this.header = { ...header };
    return this;
  }

  setIssuer(issuer: string) {
    this.issuer = issuer;
    return this;
  }

  setAudience(audience: string | string[]) {
    this.audience = audience;
    return this;
  }

  setSubject(subject: string) {
    this.subject = subject;
    return this;
  }

  setIssuedAt(time?: number) {
    this.issuedAt =
      typeof time === 'number' ? time : Math.floor(Date.now() / 1000);
    return this;
  }

  setNotBefore(time: number) {
    this.notBefore = time;
    return this;
  }

  setExpirationTime(value: number | string) {
    const reference = this.issuedAt ?? Math.floor(Date.now() / 1000);
    this.expirationTime = resolveExpiration(value, reference);
    return this;
  }

  async sign(_key: unknown): Promise<string> {
    const payload: Payload = {
      ...this.payload,
    };

    if (this.issuer !== undefined) {
      payload.iss = this.issuer;
    }
    if (this.audience !== undefined) {
      payload.aud = this.audience;
    }
    if (this.subject !== undefined) {
      payload.sub = this.subject;
    }
    if (this.issuedAt !== undefined) {
      payload.iat = this.issuedAt;
    }
    if (this.notBefore !== undefined) {
      payload.nbf = this.notBefore;
    }
    if (this.expirationTime !== undefined) {
      payload.exp = this.expirationTime;
    }

    return encodeToken({
      header: this.header,
      payload,
    });
  }
}

export const generateKeyPair = async () => ({
  privateKey: Symbol('privateKey'),
  publicKey: Symbol('publicKey'),
});

export const jwtVerify = async (
  token: string,
  _key: unknown,
  options?: { issuer?: string; audience?: string | string[] },
) => {
  const decoded = decodeToken(token);
  const payload = decoded.payload ?? {};

  if (options?.issuer !== undefined && payload.iss !== options.issuer) {
    throw new Error('invalid issuer');
  }

  if (options?.audience !== undefined) {
    const audClaim = payload.aud;
    const expected = options.audience;
    const matches = Array.isArray(audClaim)
      ? Array.isArray(expected)
        ? expected.every((value) => audClaim.includes(value))
        : audClaim.includes(expected)
      : audClaim === expected;

    if (!matches) {
      throw new Error('invalid audience');
    }
  }

  return { payload };
};
