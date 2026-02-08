/**
 * Tests for date utility functions
 */

import {
  calculateEndDateWithShifts,
  overlapsWithMaintenance,
  timeRangesOverlap,
  findNextShiftStart,
  calculateDelayMinutes,
  isWithinShiftHours
} from '../src/utils/date-utils';
import { Shift, MaintenanceWindow } from '../src/types/common-types';

describe('Date Utils', () => {
  const standardShifts: Shift[] = [
    { dayOfWeek: 1, startHour: 8, endHour: 17 }, // Monday
    { dayOfWeek: 2, startHour: 8, endHour: 17 }, // Tuesday
    { dayOfWeek: 3, startHour: 8, endHour: 17 }, // Wednesday
    { dayOfWeek: 4, startHour: 8, endHour: 17 }, // Thursday
    { dayOfWeek: 5, startHour: 8, endHour: 17 }, // Friday
  ];

  describe('calculateEndDateWithShifts', () => {
    it('should calculate end date within single shift', () => {
      const start = '2026-02-10T08:00:00.000Z'; // Monday 8 AM
      const duration = 120; // 2 hours
      const end = calculateEndDateWithShifts(start, duration, standardShifts);
      expect(end).toBe('2026-02-10T10:00:00.000Z');
    });

    it('should pause work outside shift hours', () => {
      const start = '2026-02-10T16:00:00.000Z'; // Monday 4 PM (1 hour before shift ends)
      const duration = 120; // 2 hours
      const end = calculateEndDateWithShifts(start, duration, standardShifts);
      // Should work 60 min Monday (4-5PM), then 60 min Tuesday (8-9AM)
      expect(end).toBe('2026-02-11T09:00:00.000Z');
    });

    it('should skip weekends with no shifts', () => {
      const start = '2026-02-14T16:00:00.000Z'; // Friday 4 PM
      const duration = 120; // 2 hours
      const end = calculateEndDateWithShifts(start, duration, standardShifts);
      // Should work 60 min Friday (4-5PM), skip weekend, resume Monday 8AM
      expect(end).toBe('2026-02-17T09:00:00.000Z');
    });

    it('should handle multi-day work spanning multiple shifts', () => {
      const start = '2026-02-10T08:00:00.000Z'; // Monday 8 AM
      const duration = 540; // 9 hours (full day)
      const end = calculateEndDateWithShifts(start, duration, standardShifts);
      expect(end).toBe('2026-02-10T17:00:00.000Z');
    });
  });

  describe('overlapsWithMaintenance', () => {
    const maintenanceWindows: MaintenanceWindow[] = [
      {
        startDate: '2026-02-10T13:00:00.000Z',
        endDate: '2026-02-10T15:00:00.000Z',
        reason: 'Scheduled maintenance'
      }
    ];

    it('should detect overlap when work starts before and ends during maintenance', () => {
      const result = overlapsWithMaintenance(
        '2026-02-10T12:00:00.000Z',
        '2026-02-10T14:00:00.000Z',
        maintenanceWindows
      );
      expect(result).toBe(true);
    });

    it('should detect overlap when work is entirely within maintenance', () => {
      const result = overlapsWithMaintenance(
        '2026-02-10T13:30:00.000Z',
        '2026-02-10T14:30:00.000Z',
        maintenanceWindows
      );
      expect(result).toBe(true);
    });

    it('should not detect overlap when work is before maintenance', () => {
      const result = overlapsWithMaintenance(
        '2026-02-10T11:00:00.000Z',
        '2026-02-10T12:00:00.000Z',
        maintenanceWindows
      );
      expect(result).toBe(false);
    });

    it('should not detect overlap when work is after maintenance', () => {
      const result = overlapsWithMaintenance(
        '2026-02-10T16:00:00.000Z',
        '2026-02-10T17:00:00.000Z',
        maintenanceWindows
      );
      expect(result).toBe(false);
    });
  });

  describe('timeRangesOverlap', () => {
    it('should detect overlapping ranges', () => {
      expect(timeRangesOverlap(
        '2026-02-10T08:00:00.000Z',
        '2026-02-10T10:00:00.000Z',
        '2026-02-10T09:00:00.000Z',
        '2026-02-10T11:00:00.000Z'
      )).toBe(true);
    });

    it('should not detect non-overlapping ranges', () => {
      expect(timeRangesOverlap(
        '2026-02-10T08:00:00.000Z',
        '2026-02-10T10:00:00.000Z',
        '2026-02-10T11:00:00.000Z',
        '2026-02-10T13:00:00.000Z'
      )).toBe(false);
    });

    it('should detect adjacent ranges as non-overlapping', () => {
      expect(timeRangesOverlap(
        '2026-02-10T08:00:00.000Z',
        '2026-02-10T10:00:00.000Z',
        '2026-02-10T10:00:00.000Z',
        '2026-02-10T12:00:00.000Z'
      )).toBe(false);
    });
  });

  describe('calculateDelayMinutes', () => {
    it('should calculate positive delay', () => {
      const delay = calculateDelayMinutes(
        '2026-02-10T08:00:00.000Z',
        '2026-02-10T10:00:00.000Z'
      );
      expect(delay).toBe(120);
    });

    it('should calculate negative delay (earlier)', () => {
      const delay = calculateDelayMinutes(
        '2026-02-10T10:00:00.000Z',
        '2026-02-10T08:00:00.000Z'
      );
      expect(delay).toBe(-120);
    });

    it('should return zero for same times', () => {
      const delay = calculateDelayMinutes(
        '2026-02-10T08:00:00.000Z',
        '2026-02-10T08:00:00.000Z'
      );
      expect(delay).toBe(0);
    });
  });

  describe('isWithinShiftHours', () => {
    it('should return true for time within shift', () => {
      const result = isWithinShiftHours(
        '2026-02-10T10:00:00.000Z', // Monday 10 AM
        standardShifts
      );
      expect(result).toBe(true);
    });

    it('should return false for time outside shift', () => {
      const result = isWithinShiftHours(
        '2026-02-10T18:00:00.000Z', // Monday 6 PM (after 5 PM end)
        standardShifts
      );
      expect(result).toBe(false);
    });

    it('should return false for weekend with no shifts', () => {
      const result = isWithinShiftHours(
        '2026-02-15T10:00:00.000Z', // Sunday
        standardShifts
      );
      expect(result).toBe(false);
    });
  });
});
