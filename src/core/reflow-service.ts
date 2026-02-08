/**
 * Reflow Service - Main scheduling algorithm
 * Reschedules work orders when disruptions occur while respecting all constraints
 */

import { DateTime } from 'luxon';
import {
  ReflowInput,
  ReflowResult,
  WorkOrder,
  WorkCenter,
  WorkOrderChange,
  OptimizationMetrics
} from '../types/common-types';
import { DependencyResolver } from './dependency-resolver';
import { ConstraintValidator } from './constraint-validator';
import {
  calculateEndDateWithShifts,
  calculateDelayMinutes,
  findNextShiftStart,
  overlapsWithMaintenance,
  timeRangesOverlap
} from '../utils/date-utils';

export class ReflowService {
  private dependencyResolver: DependencyResolver;
  private constraintValidator: ConstraintValidator;

  constructor() {
    this.dependencyResolver = new DependencyResolver();
    this.constraintValidator = new ConstraintValidator();
  }

  /**
   * Main reflow algorithm
   * Reschedules work orders to produce a valid schedule
   */
  reflow(input: ReflowInput): ReflowResult {
    const { workOrders, workCenters, manufacturingOrders } = input;

    // Create working copies
    const updatedWorkOrders = workOrders.map(wo => ({ ...wo, data: { ...wo.data } }));
    const changes: WorkOrderChange[] = [];
    const workCenterMap = new Map(workCenters.map(wc => [wc.docId, wc]));

    // Step 1: Sort work orders by dependencies (topological sort)
    const sortedWorkOrders = this.dependencyResolver.topologicalSort(updatedWorkOrders);

    // Step 2: Process each work order in dependency order
    for (const workOrder of sortedWorkOrders) {
      // Skip maintenance work orders (cannot be rescheduled)
      if (workOrder.data.isMaintenance) {
        continue;
      }

      const originalStartDate = workOrder.data.startDate;
      const originalEndDate = workOrder.data.endDate;

      // Calculate earliest valid start time
      const earliestStart = this.calculateEarliestStartTime(
        workOrder,
        updatedWorkOrders,
        workCenterMap
      );

      // If start time needs to change, reschedule
      if (earliestStart !== workOrder.data.startDate) {
        const workCenter = workCenterMap.get(workOrder.data.workCenterId)!;

        // Calculate new end date with shift-aware logic
        const newEndDate = calculateEndDateWithShifts(
          earliestStart,
          workOrder.data.durationMinutes,
          workCenter.data.shifts
        );

        // Update work order
        workOrder.data.startDate = earliestStart;
        workOrder.data.endDate = newEndDate;

        // Record change
        const delay = calculateDelayMinutes(originalEndDate, newEndDate);
        changes.push({
          workOrderId: workOrder.docId,
          workOrderNumber: workOrder.data.workOrderNumber,
          originalStartDate,
          originalEndDate,
          newStartDate: earliestStart,
          newEndDate,
          delayMinutes: delay,
          reason: this.generateChangeReason(workOrder, updatedWorkOrders, workCenterMap)
        });
      }
    }

    // Step 3: Final validation
    const errors = this.constraintValidator.validateAll(updatedWorkOrders, workCenters);
    if (errors.length > 0) {
      throw new Error(
        `Reflow produced invalid schedule:\n${errors.map(e => `- ${e.message}`).join('\n')}`
      );
    }

    // Step 4: Calculate metrics
    const metrics = this.calculateMetrics(changes, updatedWorkOrders, workCenters);

    return {
      updatedWorkOrders,
      changes,
      explanation: this.generateExplanation(changes),
      metrics
    };
  }

  /**
   * Calculate the earliest valid start time for a work order
   * Considers dependencies, work center conflicts, shifts, and maintenance
   */
  private calculateEarliestStartTime(
    workOrder: WorkOrder,
    allWorkOrders: WorkOrder[],
    workCenterMap: Map<string, WorkCenter>
  ): string {
    const workCenter = workCenterMap.get(workOrder.data.workCenterId)!;

    // Start with current start date or earliest dependency completion
    let candidateStart = workOrder.data.startDate;

    // Check 1: All dependencies must complete first
    const parents = workOrder.data.dependsOnWorkOrderIds
      .map(id => allWorkOrders.find(wo => wo.docId === id))
      .filter((wo): wo is WorkOrder => wo !== undefined);

    if (parents.length > 0) {
      const latestParentEnd = parents.reduce((latest, parent) => {
        return parent.data.endDate > latest ? parent.data.endDate : latest;
      }, '');

      if (latestParentEnd > candidateStart) {
        candidateStart = latestParentEnd;
      }
    }

    // Check 2: Find next available slot on work center
    candidateStart = this.findNextAvailableSlot(
      candidateStart,
      workOrder,
      allWorkOrders,
      workCenter
    );

    return candidateStart;
  }

  /**
   * Find next available time slot on a work center
   * Avoids conflicts with other work orders and maintenance windows
   */
  private findNextAvailableSlot(
    startFrom: string,
    workOrder: WorkOrder,
    allWorkOrders: WorkOrder[],
    workCenter: WorkCenter
  ): string {
    let candidateStart = startFrom;
    const maxIterations = 1000;
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      // Ensure start is within shift hours
      candidateStart = this.adjustToShiftStart(candidateStart, workCenter);

      // Calculate end date for this candidate start
      const candidateEnd = calculateEndDateWithShifts(
        candidateStart,
        workOrder.data.durationMinutes,
        workCenter.data.shifts
      );

      // Check if this slot is available
      if (this.isSlotAvailable(
        candidateStart,
        candidateEnd,
        workOrder,
        allWorkOrders,
        workCenter
      )) {
        return candidateStart;
      }

      // Slot not available - find next potential start time
      candidateStart = this.findNextPotentialStart(
        candidateStart,
        candidateEnd,
        workOrder,
        allWorkOrders,
        workCenter
      );
    }

    throw new Error(
      `Could not find available slot for work order ${workOrder.data.workOrderNumber} after ${maxIterations} iterations`
    );
  }

  /**
   * Adjust start time to next shift start if outside shift hours
   */
  private adjustToShiftStart(date: string, workCenter: WorkCenter): string {
    const dt = DateTime.fromISO(date, { zone: 'utc' });
    const dayOfWeek = dt.weekday % 7;
    const shift = workCenter.data.shifts.find(s => s.dayOfWeek === dayOfWeek);

    if (!shift) {
      // No shift today, find next shift
      return findNextShiftStart(date, workCenter.data.shifts);
    }

    const hour = dt.hour;
    const minute = dt.minute;
    const currentMinutes = hour * 60 + minute;
    const shiftStartMinutes = shift.startHour * 60;
    const shiftEndMinutes = shift.endHour * 60;

    if (currentMinutes < shiftStartMinutes) {
      // Before shift starts
      return dt.startOf('day').plus({ hours: shift.startHour }).toISO()!;
    } else if (currentMinutes >= shiftEndMinutes) {
      // After shift ends
      return findNextShiftStart(date, workCenter.data.shifts);
    }

    return date;
  }

  /**
   * Check if a time slot is available (no conflicts)
   */
  private isSlotAvailable(
    startDate: string,
    endDate: string,
    workOrder: WorkOrder,
    allWorkOrders: WorkOrder[],
    workCenter: WorkCenter
  ): boolean {
    // Check work center conflicts
    const conflictingOrders = allWorkOrders.filter(wo =>
      wo.docId !== workOrder.docId &&
      wo.data.workCenterId === workOrder.data.workCenterId &&
      timeRangesOverlap(startDate, endDate, wo.data.startDate, wo.data.endDate)
    );

    if (conflictingOrders.length > 0) {
      return false;
    }

    // Check maintenance windows
    if (overlapsWithMaintenance(startDate, endDate, workCenter.data.maintenanceWindows)) {
      return false;
    }

    return true;
  }

  /**
   * Find next potential start time after a conflict
   */
  private findNextPotentialStart(
    currentStart: string,
    currentEnd: string,
    workOrder: WorkOrder,
    allWorkOrders: WorkOrder[],
    workCenter: WorkCenter
  ): string {
    // Find all blocking periods
    const blockingPeriods: Array<{ start: string; end: string }> = [];

    // Add conflicting work orders
    allWorkOrders.forEach(wo => {
      if (wo.docId !== workOrder.docId && wo.data.workCenterId === workOrder.data.workCenterId) {
        if (timeRangesOverlap(currentStart, currentEnd, wo.data.startDate, wo.data.endDate)) {
          blockingPeriods.push({ start: wo.data.startDate, end: wo.data.endDate });
        }
      }
    });

    // Add maintenance windows
    workCenter.data.maintenanceWindows.forEach(window => {
      if (timeRangesOverlap(currentStart, currentEnd, window.startDate, window.endDate)) {
        blockingPeriods.push({ start: window.startDate, end: window.endDate });
      }
    });

    if (blockingPeriods.length === 0) {
      // No specific blocker found, advance by 1 hour
      return DateTime.fromISO(currentStart, { zone: 'utc' }).plus({ hours: 1 }).toISO()!;
    }

    // Find earliest end time of blocking periods
    const earliestEnd = blockingPeriods.reduce((earliest, period) => {
      return period.end < earliest ? period.end : earliest;
    }, blockingPeriods[0].end);

    return earliestEnd;
  }

  /**
   * Generate explanation for why a work order was rescheduled
   */
  private generateChangeReason(
    workOrder: WorkOrder,
    allWorkOrders: WorkOrder[],
    workCenterMap: Map<string, WorkCenter>
  ): string {
    const reasons: string[] = [];

    // Check dependencies
    const parents = workOrder.data.dependsOnWorkOrderIds
      .map(id => allWorkOrders.find(wo => wo.docId === id))
      .filter((wo): wo is WorkOrder => wo !== undefined);

    if (parents.length > 0) {
      const delayedParents = parents.filter(p => p.data.endDate > workOrder.data.startDate);
      if (delayedParents.length > 0) {
        reasons.push(
          `Waiting for dependencies: ${delayedParents.map(p => p.data.workOrderNumber).join(', ')}`
        );
      }
    }

    // Check work center conflicts
    const workCenter = workCenterMap.get(workOrder.data.workCenterId);
    if (workCenter) {
      const conflicting = allWorkOrders.filter(wo =>
        wo.docId !== workOrder.docId &&
        wo.data.workCenterId === workOrder.data.workCenterId &&
        wo.data.endDate > workOrder.data.startDate &&
        wo.data.startDate < workOrder.data.startDate
      );

      if (conflicting.length > 0) {
        reasons.push(`Work center busy with: ${conflicting[0].data.workOrderNumber}`);
      }
    }

    return reasons.length > 0 ? reasons.join('; ') : 'Rescheduled for optimization';
  }

  /**
   * Generate overall explanation of reflow results
   */
  private generateExplanation(changes: WorkOrderChange[]): string {
    if (changes.length === 0) {
      return 'No changes needed - schedule is valid';
    }

    const totalDelay = changes.reduce((sum, c) => sum + c.delayMinutes, 0);
    const avgDelay = Math.round(totalDelay / changes.length);

    return `Rescheduled ${changes.length} work order(s). ` +
      `Total delay: ${totalDelay} minutes. ` +
      `Average delay: ${avgDelay} minutes per order.`;
  }

  /**
   * Calculate optimization metrics
   */
  private calculateMetrics(
    changes: WorkOrderChange[],
    workOrders: WorkOrder[],
    workCenters: WorkCenter[]
  ): OptimizationMetrics {
    const totalDelayMinutes = changes.reduce((sum, c) => sum + Math.max(0, c.delayMinutes), 0);

    // Calculate work center utilization
    const workCenterUtilization: Record<string, number> = {};

    workCenters.forEach(wc => {
      const orders = workOrders.filter(wo => wo.data.workCenterId === wc.docId);
      const totalWorkingMinutes = orders.reduce((sum, wo) => sum + wo.data.durationMinutes, 0);

      // Calculate available shift minutes (simplified - assumes one week)
      const weeklyShiftMinutes = wc.data.shifts.reduce((sum, shift) => {
        return sum + (shift.endHour - shift.startHour) * 60;
      }, 0);

      const utilization = weeklyShiftMinutes > 0
        ? (totalWorkingMinutes / weeklyShiftMinutes) * 100
        : 0;

      workCenterUtilization[wc.docId] = Math.round(utilization * 100) / 100;
    });

    return {
      totalDelayMinutes,
      workOrdersAffected: changes.length,
      workCenterUtilization
    };
  }
}
