/**
 * Email provider interface - abstraction for different email services
 */
export interface EmailProvider {
  name: string;
  
  /**
   * Send a single email
   */
  send(options: SendEmailOptions): Promise<SendEmailResult>;
  
  /**
   * Verify provider credentials/configuration
   */
  verify(): Promise<boolean>;
}

export interface SendEmailOptions {
  from: {
    email: string;
    name?: string;
  };
  to: {
    email: string;
    name?: string;
  };
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  providerMessageId?: string;
  error?: string;
}

/**
 * Email tracking configuration
 */
export interface TrackingConfig {
  trackOpens: boolean;
  trackClicks: boolean;
  customDomain?: string;
}

/**
 * Provider-specific configuration
 */
export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface OutlookConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  tenantId?: string;
}

export interface SESConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  configurationSetName?: string;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

