import { logger, createLogger } from '../../shared/logger/index.js';
import { sleep } from '../../shared/utils/index.js';
import { 
  fetchPendingEvents, 
  markEventProcessed, 
  markEventFailed,
  isEventProcessed,
} from './outbox.js';
import type { DomainEvent, EventHandler, EventType } from './types.js';

const dispatcherLogger = createLogger({ module: 'event-dispatcher' });

/**
 * Event handler registry
 */
const handlers = new Map<string, EventHandler[]>();

/**
 * Register a handler for an event type
 */
export function registerHandler<T>(eventType: EventType | string, handler: EventHandler<T>): void {
  const existing = handlers.get(eventType) || [];
  existing.push(handler as EventHandler);
  handlers.set(eventType, existing);
  dispatcherLogger.debug({ eventType }, 'Registered event handler');
}

/**
 * Register multiple handlers for multiple event types
 */
export function registerHandlers(
  registrations: Array<{ eventType: EventType | string; handler: EventHandler }>
): void {
  for (const { eventType, handler } of registrations) {
    registerHandler(eventType, handler);
  }
}

/**
 * Dispatch an event to all registered handlers
 */
async function dispatchEvent(event: DomainEvent): Promise<void> {
  const eventHandlers = handlers.get(event.eventType) || [];
  
  if (eventHandlers.length === 0) {
    dispatcherLogger.debug({ eventType: event.eventType }, 'No handlers for event type');
    return;
  }

  // Execute all handlers for this event
  const results = await Promise.allSettled(
    eventHandlers.map((handler) => handler(event))
  );

  // Log any failures
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'rejected') {
      dispatcherLogger.error(
        { 
          eventType: event.eventType, 
          eventId: event.eventId,
          error: result.reason,
          handlerIndex: i,
        },
        'Event handler failed'
      );
    }
  }

  // If any handler failed, throw to trigger retry
  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    throw new Error(`${failures.length} handler(s) failed`);
  }
}

/**
 * Process a batch of pending events
 */
async function processBatch(): Promise<number> {
  const pending = await fetchPendingEvents(50);
  
  if (pending.length === 0) {
    return 0;
  }

  dispatcherLogger.debug({ count: pending.length }, 'Processing event batch');

  let processed = 0;

  for (const { id, event } of pending) {
    try {
      // Idempotency check
      const alreadyProcessed = await isEventProcessed(event.eventId);
      if (alreadyProcessed) {
        await markEventProcessed(id, event.eventId, event.eventType);
        continue;
      }

      // Dispatch to handlers
      await dispatchEvent(event);

      // Mark as processed
      await markEventProcessed(id, event.eventId, event.eventType);
      processed++;

      dispatcherLogger.debug(
        { eventId: event.eventId, eventType: event.eventType },
        'Event processed'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await markEventFailed(id, errorMessage);
      
      dispatcherLogger.error(
        { eventId: event.eventId, eventType: event.eventType, error },
        'Event processing failed'
      );
    }
  }

  return processed;
}

/**
 * Dispatcher state
 */
let isRunning = false;
let pollIntervalMs = 1000;

/**
 * Start the event dispatcher worker
 */
export async function startDispatcher(options: { pollInterval?: number } = {}): Promise<void> {
  if (isRunning) {
    dispatcherLogger.warn('Dispatcher already running');
    return;
  }

  pollIntervalMs = options.pollInterval || 1000;
  isRunning = true;

  dispatcherLogger.info({ pollInterval: pollIntervalMs }, 'Starting event dispatcher');

  while (isRunning) {
    try {
      const processed = await processBatch();
      
      // If we processed events, immediately check for more
      // Otherwise, wait before polling again
      if (processed === 0) {
        await sleep(pollIntervalMs);
      }
    } catch (error) {
      dispatcherLogger.error({ error }, 'Error in dispatcher loop');
      await sleep(pollIntervalMs * 2);
    }
  }

  dispatcherLogger.info('Event dispatcher stopped');
}

/**
 * Stop the event dispatcher
 */
export function stopDispatcher(): void {
  dispatcherLogger.info('Stopping event dispatcher');
  isRunning = false;
}

/**
 * Process events once (for testing or manual triggers)
 */
export async function processEventsOnce(): Promise<number> {
  return processBatch();
}

