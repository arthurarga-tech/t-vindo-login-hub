import { toZonedTime, fromZonedTime, format as formatTz } from "date-fns-tz";
import type { Locale } from "date-fns";

// São Paulo timezone
export const SAO_PAULO_TIMEZONE = "America/Sao_Paulo";

/**
 * Get current date/time in São Paulo timezone
 */
export function getNowInSaoPaulo(): Date {
  return toZonedTime(new Date(), SAO_PAULO_TIMEZONE);
}

/**
 * Convert a UTC date to São Paulo timezone
 */
export function toSaoPauloTime(date: Date | string): Date {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return toZonedTime(dateObj, SAO_PAULO_TIMEZONE);
}

/**
 * Convert a São Paulo local time to UTC
 * Use this when you have a date that was created in São Paulo local time
 * and you need to convert it to UTC for storage
 */
export function fromSaoPauloTime(date: Date): Date {
  return fromZonedTime(date, SAO_PAULO_TIMEZONE);
}

/**
 * Format a date in São Paulo timezone
 */
export function formatInSaoPaulo(
  date: Date | string,
  formatString: string,
  options?: { locale?: Locale }
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatTz(dateObj, formatString, {
    timeZone: SAO_PAULO_TIMEZONE,
    ...options,
  });
}

/**
 * Get the current day of week in São Paulo (0 = Sunday, 6 = Saturday)
 */
export function getCurrentDayInSaoPaulo(): number {
  return getNowInSaoPaulo().getDay();
}

/**
 * Get current hours and minutes in São Paulo
 */
export function getCurrentTimeInSaoPaulo(): { hours: number; minutes: number } {
  const now = getNowInSaoPaulo();
  return {
    hours: now.getHours(),
    minutes: now.getMinutes(),
  };
}

/**
 * Get current time in minutes since midnight in São Paulo
 */
export function getCurrentMinutesInSaoPaulo(): number {
  const { hours, minutes } = getCurrentTimeInSaoPaulo();
  return hours * 60 + minutes;
}

/**
 * Create a date for today in São Paulo with specific hours/minutes
 */
export function createTodayInSaoPaulo(hours: number = 0, minutes: number = 0): Date {
  const now = getNowInSaoPaulo();
  now.setHours(hours, minutes, 0, 0);
  return now;
}

/**
 * Get start of day in São Paulo timezone
 */
export function startOfDayInSaoPaulo(date?: Date): Date {
  const d = date ? new Date(date.getTime()) : getNowInSaoPaulo();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day in São Paulo timezone
 */
export function endOfDayInSaoPaulo(date?: Date): Date {
  const d = date ? new Date(date.getTime()) : getNowInSaoPaulo();
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get the date string in São Paulo timezone (YYYY-MM-DD format)
 * This is the correct way to get a date for database queries
 */
export function getDateStringInSaoPaulo(date?: Date): string {
  const d = date || new Date();
  return formatTz(d, "yyyy-MM-dd", { timeZone: SAO_PAULO_TIMEZONE });
}

/**
 * Get dates for the next N days starting from today in São Paulo
 */
export function getNextDaysInSaoPaulo(count: number): Date[] {
  const dates: Date[] = [];
  const now = getNowInSaoPaulo();
  
  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);
    dates.push(date);
  }
  
  return dates;
}

/**
 * Check if two dates are the same day in São Paulo timezone
 */
export function isSameDayInSaoPaulo(date1: Date | string, date2: Date | string): boolean {
  const d1 = toSaoPauloTime(date1);
  const d2 = toSaoPauloTime(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Check if a date is today in São Paulo timezone
 */
export function isTodayInSaoPaulo(date: Date | string): boolean {
  return isSameDayInSaoPaulo(date, new Date());
}
