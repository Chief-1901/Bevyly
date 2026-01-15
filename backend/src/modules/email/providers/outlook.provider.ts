import { logger } from '../../../shared/logger/index.js';
import { decrypt } from '../../../shared/utils/crypto.js';
import type { EmailProvider, SendEmailOptions, SendEmailResult, OutlookConfig } from './types.js';
import type { EmailProviderAccount } from '../../../shared/db/schema/email-providers.js';

const providerLogger = logger.child({ provider: 'outlook' });

/**
 * Outlook/Microsoft 365 email provider using Microsoft Graph API
 * Requires OAuth2 credentials with Mail.Send scope
 */
export class OutlookProvider implements EmailProvider {
  name = 'outlook';
  private account: EmailProviderAccount;
  private accessToken: string;
  private refreshToken?: string;

  constructor(account: EmailProviderAccount) {
    this.account = account;
    
    // Decrypt tokens
    if (!account.accessToken) {
      throw new Error('Outlook account missing access token');
    }
    this.accessToken = decrypt(account.accessToken);
    
    if (account.refreshToken) {
      this.refreshToken = decrypt(account.refreshToken);
    }
  }

  /**
   * Send email via Microsoft Graph API
   * https://learn.microsoft.com/en-us/graph/api/user-sendmail
   */
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      // Build Microsoft Graph message format
      const message = this.buildGraphMessage(options);

      // Send via Microsoft Graph API
      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me/sendMail',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            saveToSentItems: true,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        providerLogger.error(
          { status: response.status, error, to: options.to.email },
          'Microsoft Graph API error'
        );
        
        // Handle token refresh on 401
        if (response.status === 401) {
          return {
            success: false,
            error: 'Outlook authentication expired. Please reconnect your account.',
          };
        }

        return {
          success: false,
          error: `Microsoft Graph API error: ${response.statusText}`,
        };
      }

      // sendMail returns 202 Accepted with no body on success
      providerLogger.info(
        { to: options.to.email },
        'Email sent via Outlook'
      );

      // Generate a pseudo message ID (Graph API doesn't return one for sendMail)
      const messageId = `outlook-${Date.now()}-${Math.random().toString(36).substring(2)}`;

      return {
        success: true,
        messageId,
        providerMessageId: messageId,
      };
    } catch (error) {
      providerLogger.error(
        { error, to: options.to.email },
        'Failed to send email via Outlook'
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify Outlook credentials
   */
  async verify(): Promise<boolean> {
    try {
      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      providerLogger.error({ error }, 'Outlook verification failed');
      return false;
    }
  }

  /**
   * Build Microsoft Graph message format
   * https://learn.microsoft.com/en-us/graph/api/resources/message
   */
  private buildGraphMessage(options: SendEmailOptions) {
    const message: any = {
      subject: options.subject,
      body: {
        contentType: options.html ? 'HTML' : 'Text',
        content: options.html || options.text || '',
      },
      toRecipients: [
        {
          emailAddress: {
            address: options.to.email,
            name: options.to.name,
          },
        },
      ],
    };

    // From (if different from authenticated user)
    if (options.from.email !== this.account.email) {
      message.from = {
        emailAddress: {
          address: options.from.email,
          name: options.from.name,
        },
      };
    }

    // CC
    if (options.cc && options.cc.length > 0) {
      message.ccRecipients = options.cc.map(addr => ({
        emailAddress: {
          address: addr.email,
          name: addr.name,
        },
      }));
    }

    // BCC
    if (options.bcc && options.bcc.length > 0) {
      message.bccRecipients = options.bcc.map(addr => ({
        emailAddress: {
          address: addr.email,
          name: addr.name,
        },
      }));
    }

    // Reply-To
    if (options.replyTo) {
      message.replyTo = [
        {
          emailAddress: {
            address: options.replyTo,
          },
        },
      ];
    }

    // Custom headers (Internet Message Headers)
    if (options.headers) {
      message.internetMessageHeaders = Object.entries(options.headers).map(
        ([name, value]) => ({ name, value })
      );
    }

    return message;
  }
}

