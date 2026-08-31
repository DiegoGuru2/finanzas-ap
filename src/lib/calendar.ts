/**
 * Generates an iCalendar (.ics) file content with built-in alarms (VALARM)
 * for importing into Google Calendar, Apple Calendar, or Outlook.
 */
export interface CalendarEvent {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  amount?: number;
}

export function generateIcsCalendar(
  events: CalendarEvent[],
  calendarName = 'ProyecAhorro - Cronograma de Pagos'
): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  const now = new Date();
  const dtStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ProyecAhorro//Payment Schedule//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    `X-WR-TIMEZONE:America/Guayaquil`,
  ];

  events.forEach((ev, idx) => {
    const cleanDate = ev.date.replace(/-/g, '');
    const uid = `proyecahorro-${cleanDate}-${idx}@proyecahorro.app`;

    // Start at 09:00 local time
    const dtStart = `${cleanDate}T090000`;
    const dtEnd = `${cleanDate}T100000`;

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`,
      'STATUS:CONFIRMED',
      // Alarma: 1 día antes a las 9:00 AM (-P1D)
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Recordatorio: Mañana es ${ev.title}`,
      'END:VALARM',
      // Alarma: El mismo día a la hora del evento (-PT0M)
      'BEGIN:VALARM',
      'TRIGGER:-PT0M',
      'ACTION:DISPLAY',
      `DESCRIPTION:¡Hoy es ${ev.title}!`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  icsLines.push('END:VCALENDAR');
  return icsLines.join('\r\n');
}

export function downloadIcsFile(content: string, filename = 'cronograma-pagos-proyecahorro.ics') {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
