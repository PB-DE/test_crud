import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * Hashes a plaintext password using scrypt with a 16-byte random salt.
 * Stored format: `<saltHex>:<derivedKeyHex>`
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

/**
 * Verifies a plaintext password against a stored `<saltHex>:<derivedKeyHex>` hash
 * using constant-time comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash || !storedHash.includes(':')) {
    return false;
  }

  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;

  try {
    const keyBuffer = Buffer.from(keyHex, 'hex');
    const derivedBuffer = scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedBuffer.length) return false;
    return timingSafeEqual(keyBuffer, derivedBuffer);
  } catch {
    return false;
  }
}
