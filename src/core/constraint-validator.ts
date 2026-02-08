/**
 * Constraint Validator - Validates scheduling constraints
 * Checks work center conflicts, shift boundaries, maintenance windows, and dependencies
 */

import { WorkOrder, WorkCenter, ValidationError } from '../types/common-types';
import { timeRangesOverlap, overlapsWithMaintenance, isWithinShiftHours } from '../utils/date-utils';
import { DependencyResolver } from './dependency-resolver';

export class ConstraintValidator {
  private dependencyResolver: DependencyResolver;

  constructor() {
    this.dependencyResolver = new DependencyResolver();
  }

  /**
   * Validate all constraints for a set of work orders
   * Returns array of validation errors (empty if valid)
   */
  validateAll(
    workOrders: WorkOrder[],
    workCenters: WorkCenter[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for circular dependencies
    const graph = this.dependencyResolver.buildDependencyGraph(workOrders);
    const cycleError = this.dependencyResolver.detectCycles(graph);
    if (cycleError) {
      errors.push(cycleError);
    }

    // Check dependency constraints
    errors.push(...this.validateDependencies(workOrders));

    // Check work center conflicts
    errors.push(...this.validateWorkCenterConflicts(workOrders));

    // Check shift boundaries
    errors.push(...this.validateShiftBoundaries(workOrders, workCenters));

    // Check maintenance windows
    errors.push(...this.validateMaintenanceWindows(workOrders, workCenters));

    return errors;
  }

  /**
   * Check if all dependencies are satisfied
   * (All parent work orders must complete before child starts)
   */
  validateDependencies(workOrders: WorkOrder[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const workOrderMap = new Map(workOrders.map(wo => [wo.docId, wo]));

    workOrders.forEach(wo => {
      const parents = wo.data.dependsOnWorkOrderIds
        .map(id => workOrderMap.get(id))
        .filter((parent): parent is WorkOrder => parent !== undefined);

      parents.forEach(parent => {
        // Parent must complete before child starts
        if (parent.data.endDate > wo.data.startDate) {
          errors.push({
            type: 'DEPENDENCY_VIOLATION',
            message: `Work order ${wo.data.workOrderNumber} starts before dependency ${parent.data.workOrderNumber} completes`,
            workOrderIds: [wo.docId, parent.docId]
          });
        }
      });
    });

    return errors;
  }

  /**
   * Check for work center conflicts
   * (Only one work order per work center at a time)
   */
  validateWorkCenterConflicts(workOrders: WorkOrder[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // Group work orders by work center
    const workCenterGroups = new Map<string, WorkOrder[]>();
    workOrders.forEach(wo => {
      const wcId = wo.data.workCenterId;
      if (!workCenterGroups.has(wcId)) {
        workCenterGroups.set(wcId, []);
      }
      workCenterGroups.get(wcId)!.push(wo);
    });

    // Check each work center for overlaps
    workCenterGroups.forEach((orders, workCenterId) => {
      for (let i = 0; i < orders.length; i++) {
        for (let j = i + 1; j < orders.length; j++) {
          const wo1 = orders[i];
          const wo2 = orders[j];

          if (timeRangesOverlap(
            wo1.data.startDate,
            wo1.data.endDate,
            wo2.data.startDate,
            wo2.data.endDate
          )) {
            errors.push({
              type: 'WORK_CENTER_CONFLICT',
              message: `Work center ${workCenterId} has overlapping work orders: ${wo1.data.workOrderNumber} and ${wo2.data.workOrderNumber}`,
              workOrderIds: [wo1.docId, wo2.docId]
            });
          }
        }
      }
    });

    return errors;
  }

  /**
   * Check if work orders respect shift boundaries
   * (Work should only occur during shift hours)
   * Note: This is a simplified check - full validation happens during scheduling
   */
  validateShiftBoundaries(
    workOrders: WorkOrder[],
    workCenters: WorkCenter[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const workCenterMap = new Map(workCenters.map(wc => [wc.docId, wc]));

    workOrders.forEach(wo => {
      const workCenter = workCenterMap.get(wo.data.workCenterId);
      if (!workCenter) {
        errors.push({
          type: 'SHIFT_VIOLATION',
          message: `Work order ${wo.data.workOrderNumber} references non-existent work center: ${wo.data.workCenterId}`,
          workOrderIds: [wo.docId]
        });
        return;
      }

      // Check if shifts are defined
      if (!workCenter.data.shifts || workCenter.data.shifts.length === 0) {
        errors.push({
          type: 'SHIFT_VIOLATION',
          message: `Work center ${workCenter.data.name} has no shifts defined`,
          workOrderIds: [wo.docId]
        });
      }

      // Basic check: start date should be within shift hours
      // (Full shift-aware calculation happens in date-utils)
      if (!isWithinShiftHours(wo.data.startDate, workCenter.data.shifts)) {
        errors.push({
          type: 'SHIFT_VIOLATION',
          message: `Work order ${wo.data.workOrderNumber} starts outside shift hours`,
          workOrderIds: [wo.docId]
        });
      }
    });

    return errors;
  }

  /**
   * Check if work orders overlap with maintenance windows
   */
  validateMaintenanceWindows(
    workOrders: WorkOrder[],
    workCenters: WorkCenter[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const workCenterMap = new Map(workCenters.map(wc => [wc.docId, wc]));

    workOrders.forEach(wo => {
      const workCenter = workCenterMap.get(wo.data.workCenterId);
      if (!workCenter) return;

      if (overlapsWithMaintenance(
        wo.data.startDate,
        wo.data.endDate,
        workCenter.data.maintenanceWindows
      )) {
        errors.push({
          type: 'MAINTENANCE_CONFLICT',
          message: `Work order ${wo.data.workOrderNumber} overlaps with maintenance window on ${workCenter.data.name}`,
          workOrderIds: [wo.docId]
        });
      }
    });

    return errors;
  }

  /**
   * Check if a specific work order can be scheduled at a given time
   * Returns true if valid, false otherwise
   */
  canScheduleAt(
    workOrder: WorkOrder,
    startDate: string,
    endDate: string,
    allWorkOrders: WorkOrder[],
    workCenters: WorkCenter[]
  ): boolean {
    const workCenter = workCenters.find(wc => wc.docId === workOrder.data.workCenterId);
    if (!workCenter) return false;

    // Check work center conflicts
    const otherOrders = allWorkOrders.filter(wo =>
      wo.docId !== workOrder.docId &&
      wo.data.workCenterId === workOrder.data.workCenterId
    );

    for (const other of otherOrders) {
      if (timeRangesOverlap(startDate, endDate, other.data.startDate, other.data.endDate)) {
        return false;
      }
    }

    // Check maintenance windows
    if (overlapsWithMaintenance(startDate, endDate, workCenter.data.maintenanceWindows)) {
      return false;
    }

    // Check dependencies
    const parents = workOrder.data.dependsOnWorkOrderIds
      .map(id => allWorkOrders.find(wo => wo.docId === id))
      .filter((wo): wo is WorkOrder => wo !== undefined);

    for (const parent of parents) {
      if (parent.data.endDate > startDate) {
        return false;
      }
    }

    return true;
  }
}
