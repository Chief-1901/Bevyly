/**
 * Calendar provider interface - abstraction for different calendar services
 */
export interface CalendarProvider {
  name: string;

  /**
   * Create a calendar event
   */
  createEvent(options: CreateCalendarEventOptions): Promise<CalendarEventResult>;

  /**
   * Update a calendar event
   */
  updateEvent(eventId: string, options: UpdateCalendarEventOptions): Promise<CalendarEventResult>;

  /**
   * Cancel/delete a calendar event
   */
  cancelEvent(eventId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Get available time slots
   */
  getAvailability(options: AvailabilityOptions): Promise<TimeSlot[]>;

  /**
   * Verify provider credentials
   */
  verify(): Promise<boolean>;
}

export interface CreateCalendarEventOptions {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  location?: string;
  attendees: Array<{
    email: string;
    name?: string;
    optional?: boolean;
  }>;
  conferencing?: {
    provider: 'google_meet' | 'zoom' | 'teams';
  };
  reminders?: Array<{
    method: 'email' | 'popup';
    minutesBefore: number;
  }>;
}

export interface UpdateCalendarEventOptions {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    optional?: boolean;
  }>;
}

export interface CalendarEventResult {
  success: boolean;
  eventId?: string;
  providerEventId?: string;
  meetingLink?: string;
  error?: string;
}

export interface AvailabilityOptions {
  startDate: Date;
  endDate: Date;
  timezone: string;
  durationMinutes: number;
  workingHours?: {
    start: number; // hour of day (0-23)
    end: number;
  };
  excludeWeekends?: boolean;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

/**
 * Provider-specific configuration
 */
export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface OutlookCalendarConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  tenantId?: string;
}

