#!/usr/bin/env node
/**
 * Kafka Consumer Worker
 * 
 * Standalone worker process that consumes events from Kafka topics
 * and routes them to registered handlers.
 * 
 * Usage:
 *   node dist/workers/kafka-consumer.js
 *   
 * Environment:
 *   KAFKA_ENABLED=true
 *   KAFKA_BROKERS=localhost:9092
 *   KAFKA_GROUP_ID=salesos-event-handlers (optional)
 */

// Initialize OpenTelemetry first
import '../shared/telemetry/index.js';

import { createLogger } from '../shared/logger/index.js';
import { config } from '../shared/config/index.js';
import { startKafkaConsumer, stopKafkaConsumer } from '../modules/events/kafka-consumer.js';

const workerLogger = createLogger({ module: 'kafka-consumer-worker' });

async function main() {
  workerLogger.info(
    {
      kafkaEnabled: config.kafkaEnabled,
      kafkaBrokers: config.kafkaBrokers,
      nodeEnv: config.nodeEnv,
    },
    '🚀 Starting Kafka Consumer Worker'
  );

  if (!config.kafkaEnabled) {
    workerLogger.error('KAFKA_ENABLED is not set to true. Exiting.');
    process.exit(1);
  }

  const groupId = process.env.KAFKA_GROUP_ID || 'salesos-event-handlers';

  try {
    await startKafkaConsumer({ groupId });
    // The consumer will run until stopped
    workerLogger.info({ groupId }, 'Kafka consumer running');
  } catch (error) {
    workerLogger.error({ error }, 'Fatal error in Kafka consumer');
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  workerLogger.info({ signal }, 'Received shutdown signal');
  
  try {
    await stopKafkaConsumer();
    workerLogger.info('Kafka consumer stopped gracefully');
    process.exit(0);
  } catch (error) {
    workerLogger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  workerLogger.error({ reason, promise }, 'Unhandled Promise Rejection');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  workerLogger.error({ error }, 'Uncaught Exception');
  process.exit(1);
});

// Start the worker
main().catch((error) => {
  workerLogger.error({ error }, 'Failed to start worker');
  process.exit(1);
});

