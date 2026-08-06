import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string | null,
): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function randomToken(size = 48): string {
  return crypto.randomBytes(size).toString('hex');
}

export function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Deterministic SHA-256 digest for high-entropy tokens (e.g. refresh tokens).
 *  Bcrypt is unsuitable here: it truncates input to 72 bytes, so two tokens
 *  sharing a long identical prefix would collide. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function verifyTokenHash(token: string, hash: string | null): boolean {
  if (!hash) return false;
  const actual = crypto.createHash('sha256').update(token, 'utf8').digest();
  const expected = Buffer.from(hash, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}
