/**
 * OpenTelemetry Configuration
 * 
 * Provides standardized telemetry configuration across all services.
 * Each service can override the service name via SERVICE_NAME env var.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

// Configuration
const otelEnabled = process.env.OTEL_ENABLED === 'true';
// Use SERVICE_NAME (microservice) or OTEL_SERVICE_NAME (legacy) or default
const serviceName = process.env.SERVICE_NAME
  ? `bevyly-${process.env.SERVICE_NAME}`
  : (process.env.OTEL_SERVICE_NAME || 'bevyly-backend');
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const environment = process.env.NODE_ENV || 'development';

// Export service name for use in logging
export const telemetryServiceName = serviceName;

if (otelEnabled && endpoint) {
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '0.1.0',
    'deployment.environment.name': environment,
    'service.namespace': 'bevyly',
    'service.instance.id': process.env.HOSTNAME || process.pid.toString(),
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${endpoint}/v1/metrics`,
      }),
      exportIntervalMillis: 60000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        // Enable HTTP instrumentation with request-id header capture
        '@opentelemetry/instrumentation-http': {
          requestHook: (span, request) => {
            const requestId = (request as any).headers?.['x-request-id'];
            if (requestId) {
              span.setAttribute('http.request.id', requestId);
            }
          },
        },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down'))
      .catch((err) => console.error('Error shutting down OTel SDK', err))
      .finally(() => process.exit(0));
  });

  console.log(`OpenTelemetry initialized for ${serviceName} (env: ${environment})`);
} else {
  console.log('OpenTelemetry disabled or no endpoint configured');
}

