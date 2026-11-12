import { SessionUser, isValidUserRole } from './types';

export const SESSION_COOKIE_NAME = 'dlt_session';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

interface SessionPayload extends SessionUser {
  exp: number;
}

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.GOOGLE_PRIVATE_KEY?.trim() ||
    'dlt-asset-tracking-fallback-secret-2026'
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(getSessionSecret());
  return crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionToken(
  user: SessionUser,
  ttlSeconds: number = SESSION_TTL_SECONDS
): Promise<string> {
  const payload: SessionPayload = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const encoder = new TextEncoder();
  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await getHmacKey();
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(encodedPayload)
  );
  const encodedSig = bytesToBase64Url(new Uint8Array(signatureBuffer));
  return `${encodedPayload}.${encodedSig}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionUser | null> {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, encodedSig] = parts;
  if (!encodedPayload || !encodedSig) return null;

  try {
    const encoder = new TextEncoder();
    const key = await getHmacKey();
    const sigBytes = base64UrlToBytes(encodedSig);
    const sigCopy = new Uint8Array(sigBytes.length);
    sigCopy.set(sigBytes);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigCopy,
      encoder.encode(encodedPayload)
    );
    if (!isValid) return null;

    const payloadBytes = base64UrlToBytes(encodedPayload);
    const decodedJson = new TextDecoder().decode(payloadBytes);
    const parsed = JSON.parse(decodedJson) as SessionPayload;

    if (!parsed || typeof parsed.exp !== 'number' || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (!parsed.id || !parsed.username || !parsed.displayName || !isValidUserRole(parsed.role)) {
      return null;
    }

    return {
      id: parsed.id,
      username: parsed.username,
      displayName: parsed.displayName,
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

export function extractCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(pair.slice(idx + 1).trim());
    }
  }
  return null;
}

export async function getSessionFromRequest(request: Request): Promise<SessionUser | null> {
  const cookieHeader = request.headers.get('cookie');
  const token = extractCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  return verifySessionToken(token);
}
