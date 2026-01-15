import { logger } from '../../../shared/logger/index.js';
import { decrypt } from '../../../shared/utils/crypto.js';
import type { EmailProvider, SendEmailOptions, SendEmailResult, GmailConfig } from './types.js';
import type { EmailProviderAccount } from '../../../shared/db/schema/email-providers.js';

const providerLogger = logger.child({ provider: 'gmail' });

/**
 * Gmail email provider using Gmail API
 * Requires OAuth2 credentials with gmail.send scope
 */
export class GmailProvider implements EmailProvider {
  name = 'gmail';
  private account: EmailProviderAccount;
  private accessToken: string;
  private refreshToken?: string;

  constructor(account: EmailProviderAccount) {
    this.account = account;
    
    // Decrypt tokens
    if (!account.accessToken) {
      throw new Error('Gmail account missing access token');
    }
    this.accessToken = decrypt(account.accessToken);
    
    if (account.refreshToken) {
      this.refreshToken = decrypt(account.refreshToken);
    }
  }

  /**
   * Send email via Gmail API
   * https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send
   */
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      // Build RFC 2822 formatted message
      const message = this.buildRFC2822Message(options);
      
      // Convert to base64url (Gmail API requirement)
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send via Gmail API
      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raw: encodedMessage,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        providerLogger.error(
          { status: response.status, error, to: options.to.email },
          'Gmail API error'
        );
        
        // TODO: Handle token refresh on 401
        if (response.status === 401) {
          return {
            success: false,
            error: 'Gmail authentication expired. Please reconnect your account.',
          };
        }

        return {
          success: false,
          error: `Gmail API error: ${response.statusText}`,
        };
      }

      const result = await response.json();
      
      providerLogger.info(
        { 
          to: options.to.email, 
          messageId: result.id,
          threadId: result.threadId,
        },
        'Email sent via Gmail'
      );

      return {
        success: true,
        messageId: result.id,
        providerMessageId: result.id,
      };
    } catch (error) {
      providerLogger.error(
        { error, to: options.to.email },
        'Failed to send email via Gmail'
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify Gmail credentials
   */
  async verify(): Promise<boolean> {
    try {
      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      providerLogger.error({ error }, 'Gmail verification failed');
      return false;
    }
  }

  /**
   * Build RFC 2822 formatted email message
   */
  private buildRFC2822Message(options: SendEmailOptions): string {
    const lines: string[] = [];

    // From
    lines.push(`From: ${this.formatAddress(options.from)}`);

    // To
    lines.push(`To: ${this.formatAddress(options.to)}`);

    // CC
    if (options.cc && options.cc.length > 0) {
      lines.push(`Cc: ${options.cc.map(addr => this.formatAddress(addr)).join(', ')}`);
    }

    // BCC
    if (options.bcc && options.bcc.length > 0) {
      lines.push(`Bcc: ${options.bcc.map(addr => this.formatAddress(addr)).join(', ')}`);
    }

    // Reply-To
    if (options.replyTo) {
      lines.push(`Reply-To: ${options.replyTo}`);
    }

    // Subject
    lines.push(`Subject: ${options.subject}`);

    // Custom headers
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        lines.push(`${key}: ${value}`);
      }
    }

    // MIME version
    lines.push('MIME-Version: 1.0');

    // Content type (multipart if both HTML and text)
    if (options.html && options.text) {
      const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
      lines.push('');
      
      // Text part
      lines.push(`--${boundary}`);
      lines.push('Content-Type: text/plain; charset="UTF-8"');
      lines.push('');
      lines.push(options.text);
      lines.push('');
      
      // HTML part
      lines.push(`--${boundary}`);
      lines.push('Content-Type: text/html; charset="UTF-8"');
      lines.push('');
      lines.push(options.html);
      lines.push('');
      lines.push(`--${boundary}--`);
    } else if (options.html) {
      lines.push('Content-Type: text/html; charset="UTF-8"');
      lines.push('');
      lines.push(options.html);
    } else {
      lines.push('Content-Type: text/plain; charset="UTF-8"');
      lines.push('');
      lines.push(options.text || '');
    }

    return lines.join('\r\n');
  }

  /**
   * Format email address with optional name
   */
  private formatAddress(addr: { email: string; name?: string }): string {
    if (addr.name) {
      // Escape quotes in name
      const safeName = addr.name.replace(/"/g, '\\"');
      return `"${safeName}" <${addr.email}>`;
    }
    return addr.email;
  }
}

