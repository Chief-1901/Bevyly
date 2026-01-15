import { logger } from '../../../shared/logger/index.js';
import { generateId } from '../../../shared/utils/id.js';
import type { 
  CalendarProvider, 
  CreateCalendarEventOptions, 
  UpdateCalendarEventOptions,
  CalendarEventResult, 
  AvailabilityOptions, 
  TimeSlot 
} from './types.js';

const providerLogger = logger.child({ provider: 'mock-calendar' });

/**
 * Mock calendar provider for development and testing
 */
export class MockCalendarProvider implements CalendarProvider {
  name = 'mock';

  async createEvent(options: CreateCalendarEventOptions): Promise<CalendarEventResult> {
    providerLogger.info(
      {
        title: options.title,
        startTime: options.startTime,
        attendees: options.attendees.length,
      },
      'Mock calendar event created'
    );

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const eventId = generateId('evt');
    
    // Generate mock meeting link if conferencing requested
    let meetingLink: string | undefined;
    if (options.conferencing) {
      switch (options.conferencing.provider) {
        case 'google_meet':
          meetingLink = `https://meet.google.com/mock-${eventId.slice(0, 8)}`;
          break;
        case 'zoom':
          meetingLink = `https://zoom.us/j/mock${Math.random().toString().slice(2, 12)}`;
          break;
        case 'teams':
          meetingLink = `https://teams.microsoft.com/l/meetup-join/mock-${eventId.slice(0, 8)}`;
          break;
      }
    }

    return {
      success: true,
      eventId,
      providerEventId: `mock-${eventId}`,
      meetingLink,
    };
  }

  async updateEvent(eventId: string, options: UpdateCalendarEventOptions): Promise<CalendarEventResult> {
    providerLogger.info(
      {
        eventId,
        updates: Object.keys(options),
      },
      'Mock calendar event updated'
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      success: true,
      eventId,
      providerEventId: `mock-${eventId}`,
    };
  }

  async cancelEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    providerLogger.info({ eventId }, 'Mock calendar event cancelled');

    await new Promise((resolve) => setTimeout(resolve, 50));

    return { success: true };
  }

  async getAvailability(options: AvailabilityOptions): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const { startDate, endDate, durationMinutes, workingHours, excludeWeekends } = options;

    const workStart = workingHours?.start ?? 9;
    const workEnd = workingHours?.end ?? 17;

    let current = new Date(startDate);
    
    while (current < endDate) {
      const dayOfWeek = current.getDay();
      
      // Skip weekends if requested
      if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        current.setDate(current.getDate() + 1);
        current.setHours(workStart, 0, 0, 0);
        continue;
      }

      const hour = current.getHours();
      
      // Only during working hours
      if (hour >= workStart && hour < workEnd) {
        const slotEnd = new Date(current.getTime() + durationMinutes * 60000);
        
        // Simulate some busy slots (randomly mark ~30% as unavailable)
        const available = Math.random() > 0.3;
        
        slots.push({
          start: new Date(current),
          end: slotEnd,
          available,
        });
      }

      // Move to next slot
      current = new Date(current.getTime() + durationMinutes * 60000);
      
      // If past working hours, move to next day
      if (current.getHours() >= workEnd) {
        current.setDate(current.getDate() + 1);
        current.setHours(workStart, 0, 0, 0);
      }
    }

    return slots;
  }

  async verify(): Promise<boolean> {
    providerLogger.info('Mock calendar provider verified');
    return true;
  }
}

