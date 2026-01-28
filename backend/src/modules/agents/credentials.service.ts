/**
 * Integration Credentials Service
 *
 * Manages retrieval and decryption of integration credentials.
 * Uses platform-level defaults with tenant overrides.
 */

import { eq, and } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { integrationCredentials } from '../../shared/db/schema/index.js';
import { config } from '../../shared/config/index.js';
import { logger } from '../../shared/logger/index.js';
import type { CustomerId } from '../../shared/types/index.js';
import type { IntegrationCredentialData, IntegrationProvider } from './types.js';

const log = logger.child({ module: 'credentials-service' });

/**
 * Decrypt an encrypted credential value
 * TODO: Implement proper encryption using a secrets manager
 */
function decryptValue(encryptedValue: string): string {
  // For now, credentials are stored as base64
  // In production, use AWS KMS, HashiCorp Vault, or similar
  try {
    return Buffer.from(encryptedValue, 'base64').toString('utf-8');
  } catch {
    // If not base64, assume it's already plain text (dev mode)
    return encryptedValue;
  }
}

/**
 * Get platform-level default credentials
 */
function getPlatformCredentials(): Map<string, IntegrationCredentialData> {
  const credentials = new Map<string, IntegrationCredentialData>();

  // Apify credentials (for Apollo enrichment)
  if (config.apifyApiKey) {
    credentials.set('apify', {
      provider: 'apify',
      apiKey: config.apifyApiKey,
      config: {
        apolloActorId: config.apifyApolloActorId,
      },
    });
  }

  // Google Search API
  if (config.googleSearchApiKey && config.googleSearchCx) {
    credentials.set('google_search', {
      provider: 'google_search',
      apiKey: config.googleSearchApiKey,
      config: {
        cx: config.googleSearchCx,
      },
    });
  }

  // Google Maps API
  if (config.googleMapsApiKey) {
    credentials.set('google_maps', {
      provider: 'google_maps',
      apiKey: config.googleMapsApiKey,
    });
  }

  // OpenAI API (for prompt parsing)
  if (config.openaiApiKey) {
    credentials.set('openai', {
      provider: 'openai',
      apiKey: config.openaiApiKey,
      config: {
        model: config.openaiModel,
      },
    });
  }

  return credentials;
}

/**
 * Get integration credentials for a customer
 * Combines platform defaults with tenant-specific overrides
 */
export async function getIntegrationCredentials(
  customerId: CustomerId
): Promise<Map<string, IntegrationCredentialData>> {
  // Start with platform defaults
  const credentials = getPlatformCredentials();

  // Get tenant-specific overrides
  try {
    const db = getDb();
    const tenantCreds = await db
      .select()
      .from(integrationCredentials)
      .where(
        and(
          eq(integrationCredentials.customerId, customerId),
          eq(integrationCredentials.isActive, true)
        )
      );

    // Apply tenant overrides
    for (const cred of tenantCreds) {
      const decryptedKey = decryptValue(cred.encryptedApiKey);
      const decryptedSecret = cred.encryptedApiSecret
        ? decryptValue(cred.encryptedApiSecret)
        : undefined;

      credentials.set(cred.provider, {
        provider: cred.provider as IntegrationProvider,
        apiKey: decryptedKey,
        apiSecret: decryptedSecret,
        config: (cred.config as Record<string, unknown>) || undefined,
      });

      log.debug(
        { customerId, provider: cred.provider },
        'Using tenant-specific credentials'
      );
    }
  } catch (error) {
    log.warn({ error, customerId }, 'Failed to load tenant credentials, using platform defaults');
  }

  return credentials;
}

/**
 * Check if a specific provider credential is available
 */
export async function hasCredential(
  customerId: CustomerId,
  provider: IntegrationProvider
): Promise<boolean> {
  const credentials = await getIntegrationCredentials(customerId);
  return credentials.has(provider);
}

/**
 * Get a specific credential for a customer
 */
export async function getCredential(
  customerId: CustomerId,
  provider: IntegrationProvider
): Promise<IntegrationCredentialData | undefined> {
  const credentials = await getIntegrationCredentials(customerId);
  return credentials.get(provider);
}
