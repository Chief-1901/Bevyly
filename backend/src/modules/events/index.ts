export * from './types.js';
export * from './outbox.js';
export { registerHandler, registerHandlers, startDispatcher, stopDispatcher, processEventsOnce } from './dispatcher.js';
export { registerEngagementHandlers } from './handlers/engagement.handler.js';
export { registerActivityHandlers } from './handlers/activity.handler.js';

import { registerEngagementHandlers } from './handlers/engagement.handler.js';
import { registerActivityHandlers } from './handlers/activity.handler.js';

/**
 * Initialize all event handlers
 */
export function initializeEventHandlers(): void {
  registerEngagementHandlers();
  registerActivityHandlers();
}

