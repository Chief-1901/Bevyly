import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  // Server
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(3000),
  host: z.string().default('0.0.0.0'),

  // Database
  databaseUrl: z.string().url(),
  databasePoolMin: z.coerce.number().default(2),
  databasePoolMax: z.coerce.number().default(10),
  // SSL configuration for Postgres
  databaseSsl: z
    .string()
    .transform((v) => v === 'true')
    .default('true'), // Default to SSL enabled for security
  databaseSslRejectUnauthorized: z
    .string()
    .transform((v) => v === 'true')
    .default('true'), // Default to strict verification; set false for Supabase in dev

  // Redis
  redisUrl: z.string().default('redis://localhost:6379'),

  // Auth
  jwtSecret: z.string().min(32),
  jwtAccessExpiry: z.string().default('15m'),
  jwtRefreshExpiry: z.string().default('7d'),
  apiKeyPrefix: z.string().default('sk_'),

  // Encryption
  encryptionKey: z.string().min(32),

  // Rate Limiting
  rateLimitWindowMs: z.coerce.number().default(60000),
  rateLimitMaxRequests: z.coerce.number().default(100),

  // OpenTelemetry
  otelEnabled: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  otelServiceName: z.string().default('salesos-backend'),
  otelExporterEndpoint: z.string().optional(),

  // Email
  emailProvider: z.enum(['mock', 'gmail', 'outlook', 'ses']).default('mock'),
  gmailClientId: z.string().optional(),
  gmailClientSecret: z.string().optional(),
  outlookClientId: z.string().optional(),
  outlookClientSecret: z.string().optional(),
  sesRegion: z.string().optional(),
  sesAccessKeyId: z.string().optional(),
  sesSecretAccessKey: z.string().optional(),

  // Calendar
  calendarProvider: z.enum(['mock', 'google', 'outlook']).default('mock'),
  googleCalendarClientId: z.string().optional(),
  googleCalendarClientSecret: z.string().optional(),

  // Kafka
  kafkaBrokers: z.string().default('localhost:19092').transform((s) => s.split(',')),
  kafkaClientId: z.string().default('salesos-backend'),
  kafkaEnabled: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),

  // Logging
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  logPretty: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
});

function loadConfig() {
  const raw = {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    host: process.env.HOST,

    databaseUrl: process.env.DATABASE_URL,
    databasePoolMin: process.env.DATABASE_POOL_MIN,
    databasePoolMax: process.env.DATABASE_POOL_MAX,
    databaseSsl: process.env.DATABASE_SSL,
    databaseSslRejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED,

    redisUrl: process.env.REDIS_URL,

    jwtSecret: process.env.JWT_SECRET,
    jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY,
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY,
    apiKeyPrefix: process.env.API_KEY_PREFIX,

    encryptionKey: process.env.ENCRYPTION_KEY,

    rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,

    otelEnabled: process.env.OTEL_ENABLED,
    otelServiceName: process.env.OTEL_SERVICE_NAME,
    otelExporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,

    emailProvider: process.env.EMAIL_PROVIDER,
    gmailClientId: process.env.GMAIL_CLIENT_ID,
    gmailClientSecret: process.env.GMAIL_CLIENT_SECRET,
    outlookClientId: process.env.OUTLOOK_CLIENT_ID,
    outlookClientSecret: process.env.OUTLOOK_CLIENT_SECRET,
    sesRegion: process.env.SES_REGION,
    sesAccessKeyId: process.env.SES_ACCESS_KEY_ID,
    sesSecretAccessKey: process.env.SES_SECRET_ACCESS_KEY,

    calendarProvider: process.env.CALENDAR_PROVIDER,
    googleCalendarClientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    googleCalendarClientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,

    kafkaBrokers: process.env.KAFKA_BROKERS,
    kafkaClientId: process.env.KAFKA_CLIENT_ID,
    kafkaEnabled: process.env.KAFKA_ENABLED,

    logLevel: process.env.LOG_LEVEL,
    logPretty: process.env.LOG_PRETTY,
  };

  const result = configSchema.safeParse(raw);
  if (!result.success) {
    console.error('❌ Invalid configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
export type Config = z.infer<typeof configSchema>;

