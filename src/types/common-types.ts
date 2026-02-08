/**
 * Common type definitions for the schedule reflow system
 * Based on Naologic's document structure pattern
 */

/**
 * Base document structure - all entities follow this pattern
 */
export interface BaseDocument<T = any> {
  docId: string;
  docType: string;
  data: T;
}

/**
 * Work Order - represents a production task on a work center
 */
export interface WorkOrderData {
  workOrderNumber: string;
  manufacturingOrderId: string;
  workCenterId: string;

  // Timing - ISO 8601 format (UTC)
  startDate: string;
  endDate: string;
  durationMinutes: number;  // Total working time required

  // Constraints
  isMaintenance: boolean;   // Cannot be rescheduled if true

  // Dependencies - all parents must complete before this starts
  dependsOnWorkOrderIds: string[];

  // Optional: setup time (bonus feature)
  setupTimeMinutes?: number;
}

export type WorkOrder = BaseDocument<WorkOrderData>;

/**
 * Shift schedule for a work center
 */
export interface Shift {
  dayOfWeek: number;  // 0-6, Sunday = 0
  startHour: number;  // 0-23
  endHour: number;    // 0-23
}

/**
 * Maintenance window - blocked time period on a work center
 */
export interface MaintenanceWindow {
  startDate: string;  // ISO 8601 format (UTC)
  endDate: string;    // ISO 8601 format (UTC)
  reason?: string;    // Optional description
}

/**
 * Work Center - represents a production line/machine
 */
export interface WorkCenterData {
  name: string;
  shifts: Shift[];
  maintenanceWindows: MaintenanceWindow[];
}

export type WorkCenter = BaseDocument<WorkCenterData>;

/**
 * Manufacturing Order - high-level production order
 */
export interface ManufacturingOrderData {
  manufacturingOrderNumber: string;
  itemId: string;
  quantity: number;
  dueDate: string;  // ISO 8601 format (UTC)
}

export type ManufacturingOrder = BaseDocument<ManufacturingOrderData>;

/**
 * Input to the reflow algorithm
 */
export interface ReflowInput {
  workOrders: WorkOrder[];
  workCenters: WorkCenter[];
  manufacturingOrders: ManufacturingOrder[];
}

/**
 * Details about a single work order change
 */
export interface WorkOrderChange {
  workOrderId: string;
  workOrderNumber: string;
  originalStartDate: string;
  originalEndDate: string;
  newStartDate: string;
  newEndDate: string;
  delayMinutes: number;
  reason: string;
}

/**
 * Output from the reflow algorithm
 */
export interface ReflowResult {
  updatedWorkOrders: WorkOrder[];
  changes: WorkOrderChange[];
  explanation: string;
  metrics?: OptimizationMetrics;  // Optional: bonus feature
}

/**
 * Optimization metrics (bonus feature)
 */
export interface OptimizationMetrics {
  totalDelayMinutes: number;
  workOrdersAffected: number;
  workCenterUtilization: Record<string, number>;  // workCenterId -> utilization %
}

/**
 * Validation error
 */
export interface ValidationError {
  type: 'DEPENDENCY_VIOLATION' | 'WORK_CENTER_CONFLICT' | 'SHIFT_VIOLATION' | 'MAINTENANCE_CONFLICT' | 'CIRCULAR_DEPENDENCY';
  message: string;
  workOrderIds: string[];
}

/**
 * Dependency graph node for topological sorting
 */
export interface DependencyNode {
  workOrderId: string;
  parents: string[];
  children: string[];
  depth: number;  // Distance from root nodes (0 = no dependencies)
}
