export interface CalendarEventPayload {
  title: string;
  description: string;
  location: string;
  startDate: string; // ISO string or YYYY-MM-DD
  endDate?: string;
}

export const CalendarService = {
  // Generates Google Calendar web link (works without client secrets or external tokens)
  createGoogleCalendarUrl: (event: CalendarEventPayload): string => {
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    
    // Format dates to YYYYMMDDTHHMMSSZ or YYYYMMDD
    let startFormatted = '';
    let endFormatted = '';
    
    try {
      const start = new Date(event.startDate);
      startFormatted = start.toISOString().replace(/-|:|\.\d\d\d/g, '');
      
      const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours default
      endFormatted = end.toISOString().replace(/-|:|\.\d\d\d/g, '');
    } catch {
      // Fallback
      startFormatted = '20261015T090000Z';
      endFormatted = '20261015T110000Z';
    }

    const params = new URLSearchParams({
      text: event.title,
      dates: `${startFormatted}/${endFormatted}`,
      details: `${event.description}\n\nDiselenggarakan oleh Bursa Kerja Khusus (BKK) SMK Prestasi Nusantara.`,
      location: event.location,
      add: 'alumni@sekolah.sch.id'
    });

    return `${baseUrl}&${params.toString()}`;
  },

  // Generates and downloads standard .ics file for Apple Calendar, Outlook, Google Calendar
  downloadIcsFile: (event: CalendarEventPayload, fileName = 'event-alumni.ics'): void => {
    let startFormatted = '';
    let endFormatted = '';
    try {
      const start = new Date(event.startDate);
      startFormatted = start.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
      endFormatted = end.toISOString().replace(/-|:|\.\d\d\d/g, '');
    } catch {
      startFormatted = '20261015T090000Z';
      endFormatted = '20261015T110000Z';
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AlumniTrack//School Tracer Study//ID',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
      `LOCATION:${event.location}`,
      `DTSTART:${startFormatted}`,
      `DTEND:${endFormatted}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
