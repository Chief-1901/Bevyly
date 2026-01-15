import { Kafka, Producer, Consumer, Admin, logLevel } from 'kafkajs';
import { config } from '../config/index.js';
import { logger, createLogger } from '../logger/index.js';

const kafkaLogger = createLogger({ module: 'kafka' });

// Map KafkaJS log levels to Pino
const toWinstonLogLevel = (level: logLevel): string => {
  switch (level) {
    case logLevel.ERROR:
    case logLevel.NOTHING:
      return 'error';
    case logLevel.WARN:
      return 'warn';
    case logLevel.INFO:
      return 'info';
    case logLevel.DEBUG:
      return 'debug';
  }
};

let kafka: Kafka | null = null;
let producer: Producer | null = null;
let admin: Admin | null = null;

/**
 * Get Kafka client (singleton)
 */
export function getKafka(): Kafka {
  if (!kafka) {
    kafka = new Kafka({
      clientId: config.kafkaClientId,
      brokers: config.kafkaBrokers,
      logLevel: config.nodeEnv === 'production' ? logLevel.WARN : logLevel.INFO,
      logCreator: () => {
        return ({ level, log }) => {
          const { message, ...extra } = log;
          kafkaLogger[toWinstonLogLevel(level) as 'info' | 'debug' | 'warn' | 'error'](
            extra,
            message
          );
        };
      },
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });
  }
  return kafka;
}

/**
 * Get Kafka producer (singleton)
 */
export async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = getKafka().producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
    });
    await producer.connect();
    kafkaLogger.info('Kafka producer connected');
  }
  return producer;
}

/**
 * Get Kafka admin client (singleton)
 */
export async function getAdmin(): Promise<Admin> {
  if (!admin) {
    admin = getKafka().admin();
    await admin.connect();
    kafkaLogger.info('Kafka admin connected');
  }
  return admin;
}

/**
 * Create a consumer for a specific group
 */
export function createConsumer(groupId: string): Consumer {
  return getKafka().consumer({
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxBytesPerPartition: 1048576, // 1MB
    retry: {
      initialRetryTime: 100,
      retries: 8,
    },
  });
}

/**
 * Publish a message to a topic
 */
export async function publish(
  topic: string,
  messages: Array<{
    key?: string;
    value: string;
    headers?: Record<string, string>;
  }>
): Promise<void> {
  const prod = await getProducer();
  
  await prod.send({
    topic,
    messages: messages.map((m) => ({
      key: m.key,
      value: m.value,
      headers: m.headers,
    })),
  });

  kafkaLogger.debug({ topic, messageCount: messages.length }, 'Published messages');
}

/**
 * Publish a domain event to Kafka
 */
export async function publishEvent(
  eventType: string,
  payload: Record<string, unknown>,
  options: {
    key?: string;
    customerId: string;
    correlationId?: string;
    causationId?: string;
  }
): Promise<void> {
  const topic = eventType; // e.g., 'account.created' -> topic 'account.created'
  
  const message = {
    key: options.key,
    value: JSON.stringify({
      eventType,
      payload,
      metadata: {
        customerId: options.customerId,
        correlationId: options.correlationId,
        causationId: options.causationId,
        timestamp: new Date().toISOString(),
      },
    }),
    headers: {
      'event-type': eventType,
      'customer-id': options.customerId,
      ...(options.correlationId && { 'correlation-id': options.correlationId }),
    },
  };

  await publish(topic, [message]);
}

/**
 * Disconnect all Kafka clients
 */
export async function disconnectKafka(): Promise<void> {
  const disconnections: Promise<void>[] = [];

  if (producer) {
    disconnections.push(producer.disconnect());
    producer = null;
  }

  if (admin) {
    disconnections.push(admin.disconnect());
    admin = null;
  }

  await Promise.all(disconnections);
  kafka = null;
  
  kafkaLogger.info('Kafka clients disconnected');
}

/**
 * Check if Kafka is available
 */
export async function isKafkaHealthy(): Promise<boolean> {
  try {
    const adminClient = await getAdmin();
    await adminClient.listTopics();
    return true;
  } catch {
    return false;
  }
}

