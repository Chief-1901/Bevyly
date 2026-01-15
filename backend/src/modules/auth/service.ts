import argon2 from 'argon2';
import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { customers } from '../../shared/db/schema/customers.js';
import { users, userRoles, apiKeys, refreshTokens } from '../../shared/db/schema/users.js';
import { generateTokenPair, verifyRefreshToken, generateAccessToken } from './jwt.js';
import { 
  generateCustomerId, 
  generateUserId, 
  generateId, 
  generateApiKeyId,
  generateApiKeySecret,
  generateRefreshToken as generateRefreshTokenId,
} from '../../shared/utils/id.js';
import { hash } from '../../shared/utils/crypto.js';
import { parseDuration, addDuration } from '../../shared/utils/time.js';
import { config } from '../../shared/config/index.js';
import { 
  BadRequestError, 
  UnauthorizedError, 
  NotFoundError, 
  ConflictError 
} from '../../shared/errors/index.js';
import type { CustomerId, UserId } from '../../shared/types/index.js';
import { ROLES } from './rbac.js';
import { logAuthEvent, AUDIT_ACTIONS } from '../../shared/audit/index.js';

export interface SignupInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName: string;
  companySlug?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    roles: string[];
  };
  customer: {
    id: string;
    name: string;
    slug: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface CreateApiKeyInput {
  name: string;
  scopes?: string[];
  expiresInDays?: number;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key: string; // Only returned on creation
  keyPrefix: string;
  scopes: string[];
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * Sign up a new user and customer
 */
export async function signup(input: SignupInput): Promise<AuthResponse> {
  const db = getDb();

  // Check if email already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email.toLowerCase()))
    .limit(1);

  if (existingUser.length > 0) {
    throw new ConflictError('Email already registered');
  }

  // Generate IDs
  const customerId = generateCustomerId();
  const userId = generateUserId();

  // Generate slug from company name if not provided
  const slug = input.companySlug || 
    input.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

  // Check if slug is taken
  const existingCustomer = await db
    .select()
    .from(customers)
    .where(eq(customers.slug, slug))
    .limit(1);

  if (existingCustomer.length > 0) {
    throw new ConflictError('Company slug already taken');
  }

  // Hash password
  const passwordHash = await argon2.hash(input.password);

  // Create customer and user in transaction
  await db.transaction(async (tx) => {
    // Create customer
    await tx.insert(customers).values({
      id: customerId,
      name: input.companyName,
      slug,
      plan: 'free',
      status: 'active',
    });

    // Create user
    await tx.insert(users).values({
      id: userId,
      customerId,
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName || null,
      lastName: input.lastName || null,
      status: 'active',
      emailVerified: false, // Would send verification email in production
    });

    // Assign admin role (first user is admin)
    await tx.insert(userRoles).values({
      id: generateId(),
      userId,
      role: ROLES.ADMIN,
    });
  });

  // Generate tokens
  const tokens = await generateTokenPair(
    userId as UserId,
    customerId as CustomerId,
    input.email.toLowerCase(),
    [ROLES.ADMIN]
  );

  // Store refresh token
  await storeRefreshToken(userId as UserId, tokens.refreshToken);

  return {
    user: {
      id: userId,
      email: input.email.toLowerCase(),
      firstName: input.firstName || null,
      lastName: input.lastName || null,
      roles: [ROLES.ADMIN],
    },
    customer: {
      id: customerId,
      name: input.companyName,
      slug,
    },
    tokens,
  };
}

/**
 * Log in an existing user
 */
export async function login(input: LoginInput): Promise<AuthResponse> {
  const db = getDb();

  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, input.email.toLowerCase()),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.status !== 'active') {
    throw new UnauthorizedError('Account is not active');
  }

  // Verify password
  if (!user.passwordHash) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const validPassword = await argon2.verify(user.passwordHash, input.password);
  if (!validPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Get customer
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, user.customerId))
    .limit(1);

  if (!customer || customer.status !== 'active') {
    throw new UnauthorizedError('Organization is not active');
  }

  // Get user roles
  const roles = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, user.id));

  const roleNames = roles.map((r) => r.role);

  // Generate tokens
  const tokens = await generateTokenPair(
    user.id as UserId,
    user.customerId as CustomerId,
    user.email,
    roleNames
  );

  // Store refresh token
  await storeRefreshToken(user.id as UserId, tokens.refreshToken);

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  // Audit log the successful login
  await logAuthEvent(
    user.customerId as CustomerId,
    AUDIT_ACTIONS.USER_LOGIN,
    user.id as UserId,
    user.email,
    { status: 'success' }
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: roleNames,
    },
    customer: {
      id: customer.id,
      name: customer.name,
      slug: customer.slug,
    },
    tokens,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refresh(refreshTokenValue: string): Promise<{ accessToken: string; expiresIn: number }> {
  const db = getDb();

  // Verify refresh token
  let payload: { sub: string; cid: string };
  try {
    payload = await verifyRefreshToken(refreshTokenValue);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Check if token exists and is not revoked
  const tokenHash = hash(refreshTokenValue);
  const [storedToken] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt)
      )
    )
    .limit(1);

  if (!storedToken) {
    throw new UnauthorizedError('Refresh token not found or revoked');
  }

  if (new Date() > storedToken.expiresAt) {
    throw new UnauthorizedError('Refresh token expired');
  }

  // Get user and roles
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user || user.status !== 'active') {
    throw new UnauthorizedError('User not found or inactive');
  }

  const roles = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, user.id));

  const roleNames = roles.map((r) => r.role);

  // Generate new access token
  const accessToken = await generateAccessToken(
    user.id as UserId,
    user.customerId as CustomerId,
    user.email,
    roleNames
  );

  return {
    accessToken,
    expiresIn: Math.floor(parseDuration(config.jwtAccessExpiry) / 1000),
  };
}

/**
 * Store refresh token in database
 */
async function storeRefreshToken(userId: UserId, token: string): Promise<void> {
  const db = getDb();
  const expiresAt = addDuration(new Date(), config.jwtRefreshExpiry);

  await db.insert(refreshTokens).values({
    id: generateId(),
    userId,
    tokenHash: hash(token),
    expiresAt,
  });
}

/**
 * Revoke a refresh token (logout)
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  const db = getDb();
  const tokenHash = hash(token);

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

/**
 * Create an API key
 */
export async function createApiKey(
  customerId: CustomerId,
  userId: UserId | null,
  input: CreateApiKeyInput
): Promise<ApiKeyResponse> {
  const db = getDb();

  const keyId = generateApiKeyId();
  const keySecret = generateApiKeySecret();
  const fullKey = `${config.apiKeyPrefix}${keyId}_${keySecret}`;
  const keyPrefix = `${config.apiKeyPrefix}${keyId.substring(0, 8)}`;

  const expiresAt = input.expiresInDays
    ? addDuration(new Date(), `${input.expiresInDays}d`)
    : null;

  await db.insert(apiKeys).values({
    id: keyId,
    customerId,
    userId,
    name: input.name,
    keyHash: hash(fullKey),
    keyPrefix,
    scopes: input.scopes || [],
    expiresAt,
  });

  return {
    id: keyId,
    name: input.name,
    key: fullKey, // Only returned on creation!
    keyPrefix,
    scopes: input.scopes || [],
    expiresAt,
    createdAt: new Date(),
  };
}

/**
 * List API keys for a customer
 */
export async function listApiKeys(customerId: CustomerId): Promise<Omit<ApiKeyResponse, 'key'>[]> {
  const db = getDb();

  const keys = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.customerId, customerId),
        isNull(apiKeys.revokedAt)
      )
    );

  return keys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    scopes: (k.scopes as string[]) || [],
    expiresAt: k.expiresAt,
    createdAt: k.createdAt,
  }));
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(customerId: CustomerId, keyId: string): Promise<void> {
  const db = getDb();

  const result = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.customerId, customerId)
      )
    );

  // Drizzle doesn't return affected rows directly, so we check differently
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.customerId, customerId)
      )
    )
    .limit(1);

  if (!key) {
    throw new NotFoundError('API Key', keyId);
  }
}

