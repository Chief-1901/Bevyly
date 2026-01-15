#!/usr/bin/env node
/**
 * Kafka Publisher Worker
 * 
 * Standalone worker process that polls the transactional outbox table
 * and publishes events to Kafka topics.
 * 
 * Usage:
 *   node dist/workers/kafka-publisher.js
 *   
 * Environment:
 *   KAFKA_ENABLED=true
 *   KAFKA_BROKERS=localhost:9092
 *   POLL_INTERVAL=1000 (ms)
 *   RETRY_INTERVAL=60000 (ms)
 */

// Initialize OpenTelemetry first
import '../shared/telemetry/index.js';

import { createLogger } from '../shared/logger/index.js';
import { config } from '../shared/config/index.js';
import { startKafkaPublisher, stopKafkaPublisher } from '../modules/events/kafka-publisher.js';

const workerLogger = createLogger({ module: 'kafka-publisher-worker' });

async function main() {
  workerLogger.info(
    {
      kafkaEnabled: config.kafkaEnabled,
      kafkaBrokers: config.kafkaBrokers,
      nodeEnv: config.nodeEnv,
    },
    '🚀 Starting Kafka Publisher Worker'
  );

  if (!config.kafkaEnabled) {
    workerLogger.error('KAFKA_ENABLED is not set to true. Exiting.');
    process.exit(1);
  }

  const pollInterval = parseInt(process.env.POLL_INTERVAL || '1000', 10);
  const retryInterval = parseInt(process.env.RETRY_INTERVAL || '60000', 10);

  try {
    await startKafkaPublisher({ pollInterval, retryInterval });
  } catch (error) {
    workerLogger.error({ error }, 'Fatal error in Kafka publisher');
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  workerLogger.info({ signal }, 'Received shutdown signal');
  
  try {
    await stopKafkaPublisher();
    workerLogger.info('Kafka publisher stopped gracefully');
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

