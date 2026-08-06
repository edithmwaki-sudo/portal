/**
 * Recursively censors credential-like values before they reach the audit log.
 * Key names are matched case-insensitively after stripping separators, so
 * `refresh_token`, `newPassword`, `2FA_code` etc. all match — while unrelated
 * keys such as `statusCode`/`countryCode` are left untouched.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'oldpassword',
  'currentpassword',
  'confirmpassword',
  'refreshtoken',
  'accesstoken',
  'token',
  'otp',
  'otpcode',
  'verificationcode',
  '2facode',
  'code',
  'pin',
  'secret',
  'apikey',
  'authorization',
]);

const MAX_DEPTH = 10;

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[_\-\s]/g, '');
  return SENSITIVE_KEYS.has(normalized);
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[MAX_DEPTH]';

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? '[REDACTED]' : redact(val, depth + 1);
    }
    return out;
  }

  return value;
}
