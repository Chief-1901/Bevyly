import { config } from '../../../shared/config/index.js';
import { getDb } from '../../../shared/db/client.js';
import { emailProviderAccounts } from '../../../shared/db/schema/email-providers.js';
import { eq, and } from 'drizzle-orm';
import { MockEmailProvider } from './mock.provider.js';
import { GmailProvider } from './gmail.provider.js';
import { OutlookProvider } from './outlook.provider.js';
import type { EmailProvider } from './types.js';
import type { CustomerId } from '../../../shared/types/index.js';

export * from './types.js';
export { MockEmailProvider } from './mock.provider.js';
export { GmailProvider } from './gmail.provider.js';
export { OutlookProvider } from './outlook.provider.js';

/**
 * Get the configured email provider (legacy - uses global config)
 * For new code, use getEmailProviderForTenant() instead
 */
export function getEmailProvider(): EmailProvider {
  switch (config.emailProvider) {
    case 'mock':
      return new MockEmailProvider();
    case 'gmail':
      throw new Error('Gmail provider requires tenant-specific configuration. Use getEmailProviderForTenant()');
    case 'outlook':
      throw new Error('Outlook provider requires tenant-specific configuration. Use getEmailProviderForTenant()');
    case 'ses':
      // TODO: Implement SES provider
      throw new Error('SES provider not implemented yet');
    default:
      return new MockEmailProvider();
  }
}

/**
 * Get email provider for a specific tenant
 * Looks up the tenant's configured email provider account and returns appropriate provider
 * 
 * @param customerId - The customer/tenant ID
 * @param providerType - Optional: specify 'gmail' or 'outlook', otherwise uses default account
 * @returns EmailProvider instance configured for the tenant
 */
export async function getEmailProviderForTenant(
  customerId: CustomerId,
  providerType?: 'gmail' | 'outlook' | 'mock'
): Promise<EmailProvider> {
  const db = getDb();

  // If mock is explicitly requested or configured globally, use mock provider
  if (providerType === 'mock' || config.emailProvider === 'mock') {
    return new MockEmailProvider();
  }

  // Look up provider account for this tenant
  let query = db
    .select()
    .from(emailProviderAccounts)
    .where(
      and(
        eq(emailProviderAccounts.customerId, customerId),
        eq(emailProviderAccounts.status, 'active')
      )
    );

  // Filter by provider type if specified, otherwise get default
  if (providerType) {
    query = query.where(eq(emailProviderAccounts.provider, providerType));
  } else {
    query = query.where(eq(emailProviderAccounts.isDefault, true));
  }

  const [account] = await query.limit(1);

  // Fall back to mock if no account configured
  if (!account) {
    // In development, fall back to mock provider
    if (config.nodeEnv === 'development') {
      return new MockEmailProvider();
    }
    throw new Error(
      `No ${providerType || 'default'} email provider account configured for customer ${customerId}`
    );
  }

  // Instantiate the appropriate provider
  switch (account.provider) {
    case 'gmail':
      return new GmailProvider(account);
    case 'outlook':
      return new OutlookProvider(account);
    default:
      throw new Error(`Unsupported email provider: ${account.provider}`);
  }
}

