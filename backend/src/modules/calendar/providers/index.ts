import { config } from '../../../shared/config/index.js';
import { MockCalendarProvider } from './mock.provider.js';
import type { CalendarProvider } from './types.js';

export * from './types.js';
export { MockCalendarProvider } from './mock.provider.js';

/**
 * Get the configured calendar provider
 */
export function getCalendarProvider(): CalendarProvider {
  switch (config.calendarProvider) {
    case 'mock':
      return new MockCalendarProvider();
    case 'google':
      // TODO: Implement Google Calendar provider
      throw new Error('Google Calendar provider not implemented yet');
    case 'outlook':
      // TODO: Implement Outlook Calendar provider
      throw new Error('Outlook Calendar provider not implemented yet');
    default:
      return new MockCalendarProvider();
  }
}

