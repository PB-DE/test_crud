import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';
import {
  createSessionToken,
  verifySessionToken,
  getSessionFromRequest,
  SESSION_COOKIE_NAME,
} from '@/lib/session';

describe('password hashing utilities', () => {
  it('hashes and verifies a password with random salt', () => {
    const hash1 = hashPassword('admin1234');
    const hash2 = hashPassword('admin1234');

    expect(hash1).not.toBe(hash2);
    expect(hash1.includes(':')).toBe(true);
    expect(verifyPassword('admin1234', hash1)).toBe(true);
    expect(verifyPassword('admin1234', hash2)).toBe(true);
    expect(verifyPassword('wrongpass', hash1)).toBe(false);
    expect(verifyPassword('', hash1)).toBe(false);
    expect(verifyPassword('admin1234', 'invalid-hash')).toBe(false);
  });
});

describe('session token utilities (HMAC-SHA256 Web Crypto)', () => {
  it('creates and verifies a session token preserving Thai displayName and role', async () => {
    const token = await createSessionToken({
      id: 'user-1',
      username: 'somchai',
      displayName: 'นายสมชาย ใจดี',
      role: 'staff',
    });

    const verified = await verifySessionToken(token);
    expect(verified).toEqual({
      id: 'user-1',
      username: 'somchai',
      displayName: 'นายสมชาย ใจดี',
      role: 'staff',
    });
  });

  it('rejects tampered or malformed tokens', async () => {
    const token = await createSessionToken({
      id: 'user-1',
      username: 'admin',
      displayName: 'Admin',
      role: 'admin',
    });

    const tampered = token.slice(0, -3) + 'abc';
    expect(await verifySessionToken(tampered)).toBeNull();
    expect(await verifySessionToken('not-a-token')).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();
  });

  it('rejects expired tokens', async () => {
    const expiredToken = await createSessionToken(
      {
        id: 'user-1',
        username: 'admin',
        displayName: 'Admin',
        role: 'admin',
      },
      -10 // already expired
    );

    expect(await verifySessionToken(expiredToken)).toBeNull();
  });

  it('extracts and verifies session cookie from Request headers', async () => {
    const token = await createSessionToken({
      id: 'user-admin',
      username: 'admin',
      displayName: 'ผู้ดูแลระบบ',
      role: 'admin',
    });

    const req = new Request('http://localhost:3000/api/records', {
      headers: {
        cookie: `foo=bar; ${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; other=123`,
      },
    });

    const session = await getSessionFromRequest(req);
    expect(session).toEqual({
      id: 'user-admin',
      username: 'admin',
      displayName: 'ผู้ดูแลระบบ',
      role: 'admin',
    });
  });
});
