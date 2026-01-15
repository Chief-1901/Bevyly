import * as jose from 'jose';
import { config } from '../../shared/config/index.js';
import { parseDuration } from '../../shared/utils/time.js';
import type { CustomerId, UserId } from '../../shared/types/index.js';

export interface JwtPayload {
  sub: string; // user ID
  cid: string; // customer ID
  email: string;
  roles: string[];
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

// Encode secret for jose
const secretKey = new TextEncoder().encode(config.jwtSecret);

/**
 * Generate an access token
 */
export async function generateAccessToken(
  userId: UserId,
  customerId: CustomerId,
  email: string,
  roles: string[]
): Promise<string> {
  const expiryMs = parseDuration(config.jwtAccessExpiry);

  return new jose.SignJWT({
    cid: customerId,
    email,
    roles,
    type: 'access',
  } as Omit<JwtPayload, 'sub'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + expiryMs) / 1000))
    .setIssuer('salesos')
    .sign(secretKey);
}

/**
 * Generate a refresh token
 */
export async function generateRefreshToken(
  userId: UserId,
  customerId: CustomerId
): Promise<string> {
  const expiryMs = parseDuration(config.jwtRefreshExpiry);

  return new jose.SignJWT({
    cid: customerId,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + expiryMs) / 1000))
    .setIssuer('salesos')
    .sign(secretKey);
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokenPair(
  userId: UserId,
  customerId: CustomerId,
  email: string,
  roles: string[]
): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(userId, customerId, email, roles),
    generateRefreshToken(userId, customerId),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: Math.floor(parseDuration(config.jwtAccessExpiry) / 1000),
  };
}

/**
 * Verify and decode an access token
 */
export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jose.jwtVerify(token, secretKey, {
    issuer: 'salesos',
  });

  const jwtPayload = payload as unknown as JwtPayload & { sub: string };

  if (jwtPayload.type !== 'access') {
    throw new Error('Invalid token type');
  }

  return {
    sub: jwtPayload.sub,
    cid: jwtPayload.cid,
    email: jwtPayload.email,
    roles: jwtPayload.roles,
    type: 'access',
  };
}

/**
 * Verify and decode a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<{ sub: string; cid: string }> {
  const { payload } = await jose.jwtVerify(token, secretKey, {
    issuer: 'salesos',
  });

  const jwtPayload = payload as unknown as { sub: string; cid: string; type: string };

  if (jwtPayload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  return {
    sub: jwtPayload.sub,
    cid: jwtPayload.cid,
  };
}

