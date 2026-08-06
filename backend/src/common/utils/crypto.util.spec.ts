import {
  generateOtp,
  hashPassword,
  hashToken,
  randomToken,
  verifyPassword,
  verifyTokenHash,
} from './crypto.util';

describe('crypto.util', () => {
  describe('password hashing (bcrypt)', () => {
    it('hashes and verifies a password', async () => {
      const hash = await hashPassword('S3cure#Pass!');
      expect(hash).not.toBe('S3cure#Pass!');
      expect(hash.startsWith('$2')).toBe(true);
      await expect(verifyPassword('S3cure#Pass!', hash)).resolves.toBe(true);
      await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
    });

    it('does not leak a plaintext equivalent password', async () => {
      const h1 = await hashPassword('same-password');
      const h2 = await hashPassword('same-password');
      expect(h1).not.toBe(h2); // salts are random
    });

    it('returns false for a null hash', async () => {
      await expect(verifyPassword('anything', null)).resolves.toBe(false);
    });
  });

  describe('token hashing (SHA-256 + timing-safe compare)', () => {
    it('hashes deterministically and verifies correctly', () => {
      const token = randomToken();
      const hash = hashToken(token);
      expect(hash).toHaveLength(64);
      expect(verifyTokenHash(token, hash)).toBe(true);
    });

    it('rejects a different token', () => {
      const hash = hashToken('token-A');
      expect(verifyTokenHash('token-B', hash)).toBe(false);
    });

    it('handles very long tokens with a shared prefix (bcrypt-truncation scenario)', () => {
      // Two JWT-like tokens sharing the same header + sub + sessionUuid prefix,
      // differing only near the end (the jti). SHA-256 must still distinguish them.
      const prefix =
        'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsInNlc3Npb25VdWlkIjoiMTIzNDU2NzgtYWJjZC1lZmdo';
      const t1 = `${prefix}.AAAA`;
      const t2 = `${prefix}.BBBB`;
      const h1 = hashToken(t1);
      const h2 = hashToken(t2);
      expect(h1).not.toBe(h2);
      expect(verifyTokenHash(t1, h1)).toBe(true);
      expect(verifyTokenHash(t1, h2)).toBe(false);
    });

    it('returns false for a null hash', () => {
      expect(verifyTokenHash('token', null)).toBe(false);
    });
  });

  describe('randomToken', () => {
    it('generates unique hex tokens', () => {
      const a = randomToken(48);
      const b = randomToken(48);
      expect(a).not.toBe(b);
      expect(a).toMatch(/^[0-9a-f]{96}$/);
    });
  });

  describe('generateOtp', () => {
    it('returns a 6-digit numeric string', () => {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    });
  });
});
