import { logger } from '../../../shared/logger/index.js';
import { generateId } from '../../../shared/utils/id.js';
import type { EmailProvider, SendEmailOptions, SendEmailResult } from './types.js';

const providerLogger = logger.child({ provider: 'mock' });

/**
 * Mock email provider for development and testing
 */
export class MockEmailProvider implements EmailProvider {
  name = 'mock';

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    providerLogger.info(
      {
        from: options.from.email,
        to: options.to.email,
        subject: options.subject,
      },
      'Mock email sent'
    );

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate random failures (5% failure rate)
    if (Math.random() < 0.05) {
      return {
        success: false,
        error: 'Simulated delivery failure',
      };
    }

    // Simulate bounce for test addresses
    if (options.to.email.includes('bounce')) {
      return {
        success: false,
        error: 'Hard bounce: mailbox does not exist',
      };
    }

    const messageId = generateId('msg');
    
    return {
      success: true,
      messageId,
      providerMessageId: `mock-${messageId}`,
    };
  }

  async verify(): Promise<boolean> {
    providerLogger.info('Mock provider verified');
    return true;
  }
}

