/**
 * Date utility functions using Luxon
 * Handles shift-aware date calculations for production scheduling
 */

import { DateTime } from 'luxon';
import { Shift, MaintenanceWindow } from '../types/common-types';

/**
 * Calculate end date given a start date, duration, and shift schedule
 * Work pauses outside shift hours and resumes in the next shift
 *
 * @param startDate - ISO 8601 start date (UTC)
 * @param durationMinutes - Total working minutes required
 * @param shifts - Work center shift schedule
 * @returns ISO 8601 end date (UTC)
 */
export function calculateEndDateWithShifts(
  startDate: string,
  durationMinutes: number,
  shifts: Shift[]
): string {
  let currentDate = DateTime.fromISO(startDate, { zone: 'utc' });
  let remainingMinutes = durationMinutes;

  // Safety check for infinite loops
  let maxIterations = 1000;
  let iterations = 0;

  while (remainingMinutes > 0 && iterations < maxIterations) {
    iterations++;

    // Find applicable shift for current day
    const dayOfWeek = currentDate.weekday % 7; // Luxon uses 1-7 (Mon-Sun), convert to 0-6 (Sun-Sat)
    const shift = shifts.find(s => s.dayOfWeek === dayOfWeek);

    if (!shift) {
      // No shift today, move to next day at midnight
      currentDate = currentDate.plus({ days: 1 }).startOf('day');
      continue;
    }

    // Get shift boundaries for current day
    const shiftStart = currentDate.startOf('day').plus({ hours: shift.startHour });
    const shiftEnd = currentDate.startOf('day').plus({ hours: shift.endHour });

    // If current time is before shift start, jump to shift start
    if (currentDate < shiftStart) {
      currentDate = shiftStart;
      continue;
    }

    // If current time is after shift end, move to next day
    if (currentDate >= shiftEnd) {
      currentDate = currentDate.plus({ days: 1 }).startOf('day');
      continue;
    }

    // Calculate available minutes in current shift
    const availableMinutes = shiftEnd.diff(currentDate, 'minutes').minutes;

    if (availableMinutes >= remainingMinutes) {
      // Can finish within this shift
      currentDate = currentDate.plus({ minutes: remainingMinutes });
      remainingMinutes = 0;
    } else {
      // Use all available time in this shift, continue in next shift
      remainingMinutes -= availableMinutes;
      currentDate = currentDate.plus({ days: 1 }).startOf('day');
    }
  }

  if (iterations >= maxIterations) {
    throw new Error('Shift calculation exceeded maximum iterations - possible infinite loop');
  }

  return currentDate.toISO()!;
}

/**
 * Check if a time range overlaps with any maintenance windows
 *
 * @param startDate - ISO 8601 start date (UTC)
 * @param endDate - ISO 8601 end date (UTC)
 * @param maintenanceWindows - List of maintenance windows
 * @returns true if overlap exists
 */
export function overlapsWithMaintenance(
  startDate: string,
  endDate: string,
  maintenanceWindows: MaintenanceWindow[]
): boolean {
  const start = DateTime.fromISO(startDate, { zone: 'utc' });
  const end = DateTime.fromISO(endDate, { zone: 'utc' });

  return maintenanceWindows.some(window => {
    const windowStart = DateTime.fromISO(window.startDate, { zone: 'utc' });
    const windowEnd = DateTime.fromISO(window.endDate, { zone: 'utc' });

    // Check for any overlap: (start < windowEnd) AND (end > windowStart)
    return start < windowEnd && end > windowStart;
  });
}

/**
 * Check if two time ranges overlap
 *
 * @param start1 - ISO 8601 start date (UTC)
 * @param end1 - ISO 8601 end date (UTC)
 * @param start2 - ISO 8601 start date (UTC)
 * @param end2 - ISO 8601 end date (UTC)
 * @returns true if overlap exists
 */
export function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = DateTime.fromISO(start1, { zone: 'utc' });
  const e1 = DateTime.fromISO(end1, { zone: 'utc' });
  const s2 = DateTime.fromISO(start2, { zone: 'utc' });
  const e2 = DateTime.fromISO(end2, { zone: 'utc' });

  // Overlap exists if: (start1 < end2) AND (end1 > start2)
  return s1 < e2 && e1 > s2;
}

/**
 * Find the next available shift start time after a given date
 *
 * @param date - ISO 8601 date (UTC)
 * @param shifts - Work center shift schedule
 * @returns ISO 8601 date of next shift start (UTC)
 */
export function findNextShiftStart(date: string, shifts: Shift[]): string {
  let currentDate = DateTime.fromISO(date, { zone: 'utc' });

  // Safety check
  let maxIterations = 100;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    const dayOfWeek = currentDate.weekday % 7;
    const shift = shifts.find(s => s.dayOfWeek === dayOfWeek);

    if (shift) {
      const shiftStart = currentDate.startOf('day').plus({ hours: shift.startHour });

      if (currentDate <= shiftStart) {
        return shiftStart.toISO()!;
      }
    }

    // Move to next day
    currentDate = currentDate.plus({ days: 1 }).startOf('day');
  }

  throw new Error('Could not find next shift start - check shift configuration');
}

/**
 * Calculate total delay between two dates in minutes
 *
 * @param originalDate - ISO 8601 date (UTC)
 * @param newDate - ISO 8601 date (UTC)
 * @returns Delay in minutes (positive if delayed, negative if earlier)
 */
export function calculateDelayMinutes(originalDate: string, newDate: string): number {
  const original = DateTime.fromISO(originalDate, { zone: 'utc' });
  const updated = DateTime.fromISO(newDate, { zone: 'utc' });

  return Math.round(updated.diff(original, 'minutes').minutes);
}

/**
 * Check if a date falls within shift hours
 *
 * @param date - ISO 8601 date (UTC)
 * @param shifts - Work center shift schedule
 * @returns true if date is within shift hours
 */
export function isWithinShiftHours(date: string, shifts: Shift[]): boolean {
  const dt = DateTime.fromISO(date, { zone: 'utc' });
  const dayOfWeek = dt.weekday % 7;
  const shift = shifts.find(s => s.dayOfWeek === dayOfWeek);

  if (!shift) return false;

  const hour = dt.hour;
  const minute = dt.minute;
  const currentMinutes = hour * 60 + minute;
  const shiftStartMinutes = shift.startHour * 60;
  const shiftEndMinutes = shift.endHour * 60;

  return currentMinutes >= shiftStartMinutes && currentMinutes < shiftEndMinutes;
}
