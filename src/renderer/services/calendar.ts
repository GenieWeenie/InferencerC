/**
 * Calendar Integration Service
 *
 * Schedule conversations and reminders using calendar APIs
 */

export interface CalendarConfig {
    provider: 'google' | 'outlook' | 'ical'; // Calendar provider
    apiKey?: string; // For Google Calendar API
    clientId?: string; // For OAuth
    accessToken?: string; // For OAuth
}

export interface CalendarEvent {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    attendees?: string[]; // Email addresses
    reminders?: Array<{
        minutes: number; // Minutes before event
        method: 'email' | 'popup';
    }>;
}

export interface CalendarResult {
    success: boolean;
    eventId?: string;
    eventUrl?: string; // URL to view/edit event
    error?: string;
}

class CalendarService {
    private config: CalendarConfig | null = null;
    private readonly STORAGE_KEY = 'calendar_config';

    constructor() {
        this.loadConfig();
    }

    /**
     * Load configuration from localStorage
     */
    private loadConfig(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.config = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load calendar config:', error);
        }
    }

    /**
     * Save configuration to localStorage
     */
    private saveConfig(): void {
        try {
            if (this.config) {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
            } else {
                localStorage.removeItem(this.STORAGE_KEY);
            }
        } catch (error) {
            console.error('Failed to save calendar config:', error);
        }
    }

    /**
     * Set configuration
     */
    setConfig(config: CalendarConfig): void {
        this.config = config;
        this.saveConfig();
    }

    /**
     * Get current configuration
     */
    getConfig(): CalendarConfig | null {
        return this.config;
    }

    /**
     * Check if calendar is configured
     */
    isConfigured(): boolean {
        return !!this.config?.provider;
    }

    /**
     * Create a calendar event
     */
    async createEvent(event: CalendarEvent): Promise<CalendarResult> {
        if (!this.config?.provider) {
            return { success: false, error: 'Calendar not configured' };
        }

        switch (this.config.provider) {
            case 'google':
                return this.createGoogleCalendarEvent(event);
            case 'outlook':
                return this.createOutlookCalendarEvent(event);
            case 'ical':
                return this.createICalEvent(event);
            default:
                return { success: false, error: 'Unsupported calendar provider' };
        }
    }

    /**
     * Create Google Calendar event (using Google Calendar URL)
     */
    private async createGoogleCalendarEvent(event: CalendarEvent): Promise<CalendarResult> {
        try {
            // Format dates for Google Calendar URL
            const formatDate = (date: Date): string => {
                return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            };

            const params = new URLSearchParams({
                action: 'TEMPLATE',
                text: event.title,
                dates: `${formatDate(event.startTime)}/${formatDate(event.endTime)}`,
            });

            if (event.description) {
                params.append('details', event.description);
            }

            if (event.location) {
                params.append('location', event.location);
            }

            if (event.attendees && event.attendees.length > 0) {
                params.append('add', event.attendees.join(','));
            }

            const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
            window.open(url, '_blank');

            return { success: true, eventUrl: url };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create Google Calendar event',
            };
        }
    }

    /**
     * Create Outlook Calendar event (using Outlook Calendar URL)
     */
    private async createOutlookCalendarEvent(event: CalendarEvent): Promise<CalendarResult> {
        try {
            const formatDate = (date: Date): string => {
                return date.toISOString();
            };

            const params = new URLSearchParams({
                subject: event.title,
                startdt: formatDate(event.startTime),
                enddt: formatDate(event.endTime),
            });

            if (event.description) {
                params.append('body', event.description);
            }

            if (event.location) {
                params.append('location', event.location);
            }

            const url = `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
            window.open(url, '_blank');

            return { success: true, eventUrl: url };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create Outlook Calendar event',
            };
        }
    }

    /**
     * Create iCal event (download .ics file)
     */
    private async createICalEvent(event: CalendarEvent): Promise<CalendarResult> {
        try {
            const formatDate = (date: Date): string => {
                return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            };

            const ics = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//InferencerC//Calendar//EN',
                'BEGIN:VEVENT',
                `UID:${Date.now()}@inferencerc.app`,
                `DTSTART:${formatDate(event.startTime)}`,
                `DTEND:${formatDate(event.endTime)}`,
                `SUMMARY:${this.escapeICS(event.title)}`,
            ];

            if (event.description) {
                ics.push(`DESCRIPTION:${this.escapeICS(event.description)}`);
            }

            if (event.location) {
                ics.push(`LOCATION:${this.escapeICS(event.location)}`);
            }

            if (event.attendees && event.attendees.length > 0) {
                event.attendees.forEach(attendee => {
                    ics.push(`ATTENDEE;CN=${this.escapeICS(attendee)}:mailto:${attendee}`);
                });
            }

            if (event.reminders && event.reminders.length > 0) {
                event.reminders.forEach(reminder => {
                    ics.push(`BEGIN:VALARM`);
                    ics.push(`TRIGGER:-PT${reminder.minutes}M`);
                    ics.push(`ACTION:${reminder.method.toUpperCase()}`);
                    ics.push(`END:VALARM`);
                });
            }

            ics.push('END:VEVENT');
            ics.push('END:VCALENDAR');

            const icsContent = ics.join('\r\n');
            const blob = new Blob([icsContent], { type: 'text/calendar' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create iCal event',
            };
        }
    }

    /**
     * Escape special characters for iCal format
     */
    private escapeICS(text: string): string {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    }

    /**
     * Schedule a conversation reminder
     */
    async scheduleConversationReminder(
        title: string,
        scheduledTime: Date,
        conversationSummary?: string
    ): Promise<CalendarResult> {
        return this.createEvent({
            title: `Reminder: ${title}`,
            description: conversationSummary || `Reminder to review conversation: ${title}`,
            startTime: scheduledTime,
            endTime: new Date(scheduledTime.getTime() + 15 * 60 * 1000), // 15 minutes
            reminders: [
                { minutes: 15, method: 'popup' },
                { minutes: 5, method: 'popup' },
            ],
        });
    }
}

export const calendarService = new CalendarService();
