/**
 * Integration tests for ReflowService
 */

import { ReflowService } from '../src/core/reflow-service';
import { ReflowInput, WorkOrder, WorkCenter } from '../src/types/common-types';
import { createWorkOrder } from '../src/models/work-order';
import { createWorkCenter } from '../src/models/work-center';
import { createManufacturingOrder } from '../src/models/manufacturing-order';

describe('ReflowService', () => {
  let service: ReflowService;

  beforeEach(() => {
    service = new ReflowService();
  });

  const standardShifts = [
    { dayOfWeek: 1, startHour: 8, endHour: 17 },
    { dayOfWeek: 2, startHour: 8, endHour: 17 },
    { dayOfWeek: 3, startHour: 8, endHour: 17 },
    { dayOfWeek: 4, startHour: 8, endHour: 17 },
    { dayOfWeek: 5, startHour: 8, endHour: 17 },
  ];

  describe('Valid Schedule', () => {
    it('should not change valid schedule with no conflicts', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-1', {
            workOrderNumber: 'WO-1',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-10T08:00:00.000Z',
            endDate: '2026-02-10T10:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: []
          })
        ],
        workCenters: [
          createWorkCenter('wc-1', {
            name: 'Work Center 1',
            shifts: standardShifts,
            maintenanceWindows: []
          })
        ],
        manufacturingOrders: [
          createManufacturingOrder('mo-1', {
            manufacturingOrderNumber: 'MO-1',
            itemId: 'ITEM-1',
            quantity: 100,
            dueDate: '2026-02-15T17:00:00.000Z'
          })
        ]
      };

      const result = service.reflow(input);
      expect(result.changes).toHaveLength(0);
      expect(result.explanation).toContain('No changes needed');
    });
  });

  describe('Dependency Cascades', () => {
    it('should reschedule dependent work orders when parent is delayed', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-1', {
            workOrderNumber: 'WO-1',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-10T08:00:00.000Z',
            endDate: '2026-02-10T12:00:00.000Z', // Extended by 2 hours
            durationMinutes: 240,
            isMaintenance: false,
            dependsOnWorkOrderIds: []
          }),
          createWorkOrder('wo-2', {
            workOrderNumber: 'WO-2',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-2',
            startDate: '2026-02-10T10:00:00.000Z', // Starts before parent finishes!
            endDate: '2026-02-10T12:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: ['wo-1']
          })
        ],
        workCenters: [
          createWorkCenter('wc-1', {
            name: 'Work Center 1',
            shifts: standardShifts,
            maintenanceWindows: []
          }),
          createWorkCenter('wc-2', {
            name: 'Work Center 2',
            shifts: standardShifts,
            maintenanceWindows: []
          })
        ],
        manufacturingOrders: []
      };

      const result = service.reflow(input);

      // WO-2 should be rescheduled to start after WO-1 completes
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].workOrderNumber).toBe('WO-2');

      const updatedWo2 = result.updatedWorkOrders.find(wo => wo.docId === 'wo-2')!;
      expect(updatedWo2.data.startDate).toBe('2026-02-10T12:00:00.000Z');
    });

    it('should handle multiple dependency levels', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-1', {
            workOrderNumber: 'WO-1',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-10T08:00:00.000Z',
            endDate: '2026-02-10T10:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: []
          }),
          createWorkOrder('wo-2', {
            workOrderNumber: 'WO-2',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-2',
            startDate: '2026-02-10T10:00:00.000Z',
            endDate: '2026-02-10T12:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: ['wo-1']
          }),
          createWorkOrder('wo-3', {
            workOrderNumber: 'WO-3',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-3',
            startDate: '2026-02-10T12:00:00.000Z',
            endDate: '2026-02-10T14:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: ['wo-2']
          })
        ],
        workCenters: [
          createWorkCenter('wc-1', { name: 'WC1', shifts: standardShifts, maintenanceWindows: [] }),
          createWorkCenter('wc-2', { name: 'WC2', shifts: standardShifts, maintenanceWindows: [] }),
          createWorkCenter('wc-3', { name: 'WC3', shifts: standardShifts, maintenanceWindows: [] })
        ],
        manufacturingOrders: []
      };

      const result = service.reflow(input);

      // All work orders should be scheduled in dependency order
      expect(result.updatedWorkOrders).toHaveLength(3);

      const wo1 = result.updatedWorkOrders.find(wo => wo.docId === 'wo-1')!;
      const wo2 = result.updatedWorkOrders.find(wo => wo.docId === 'wo-2')!;
      const wo3 = result.updatedWorkOrders.find(wo => wo.docId === 'wo-3')!;

      expect(wo1.data.endDate <= wo2.data.startDate).toBe(true);
      expect(wo2.data.endDate <= wo3.data.startDate).toBe(true);
    });
  });

  describe('Work Center Conflicts', () => {
    it('should reschedule overlapping work orders on same work center', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-1', {
            workOrderNumber: 'WO-1',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-10T08:00:00.000Z',
            endDate: '2026-02-10T12:00:00.000Z',
            durationMinutes: 240,
            isMaintenance: false,
            dependsOnWorkOrderIds: []
          }),
          createWorkOrder('wo-2', {
            workOrderNumber: 'WO-2',
            manufacturingOrderId: 'mo-2',
            workCenterId: 'wc-1', // Same work center!
            startDate: '2026-02-10T10:00:00.000Z', // Overlaps with WO-1
            endDate: '2026-02-10T12:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: []
          })
        ],
        workCenters: [
          createWorkCenter('wc-1', {
            name: 'Work Center 1',
            shifts: standardShifts,
            maintenanceWindows: []
          })
        ],
        manufacturingOrders: []
      };

      const result = service.reflow(input);

      // WO-2 should be rescheduled after WO-1
      expect(result.changes.length).toBeGreaterThan(0);

      const wo1 = result.updatedWorkOrders.find(wo => wo.docId === 'wo-1')!;
      const wo2 = result.updatedWorkOrders.find(wo => wo.docId === 'wo-2')!;

      // No overlap should exist
      expect(wo1.data.endDate <= wo2.data.startDate || wo2.data.endDate <= wo1.data.startDate).toBe(true);
    });
  });

  describe('Maintenance Windows', () => {
    it('should reschedule work orders that conflict with maintenance', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-1', {
            workOrderNumber: 'WO-1',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-10T12:00:00.000Z',
            endDate: '2026-02-10T14:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: []
          })
        ],
        workCenters: [
          createWorkCenter('wc-1', {
            name: 'Work Center 1',
            shifts: standardShifts,
            maintenanceWindows: [
              {
                startDate: '2026-02-10T13:00:00.000Z',
                endDate: '2026-02-10T15:00:00.000Z',
                reason: 'Scheduled maintenance'
              }
            ]
          })
        ],
        manufacturingOrders: []
      };

      const result = service.reflow(input);

      // Work order should be rescheduled to avoid maintenance
      expect(result.changes.length).toBeGreaterThan(0);

      const wo1 = result.updatedWorkOrders.find(wo => wo.docId === 'wo-1')!;

      // Should not overlap with maintenance window
      expect(
        wo1.data.endDate <= '2026-02-10T13:00:00.000Z' ||
        wo1.data.startDate >= '2026-02-10T15:00:00.000Z'
      ).toBe(true);
    });

    it('should not reschedule maintenance work orders', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-maint', {
            workOrderNumber: 'MAINT-1',
            manufacturingOrderId: 'mo-maint',
            workCenterId: 'wc-1',
            startDate: '2026-02-10T13:00:00.000Z',
            endDate: '2026-02-10T15:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: true, // Cannot be rescheduled
            dependsOnWorkOrderIds: []
          })
        ],
        workCenters: [
          createWorkCenter('wc-1', {
            name: 'Work Center 1',
            shifts: standardShifts,
            maintenanceWindows: []
          })
        ],
        manufacturingOrders: []
      };

      const result = service.reflow(input);

      // Maintenance work order should not change
      expect(result.changes).toHaveLength(0);
    });
  });

  describe('Metrics', () => {
    it('should calculate optimization metrics', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-1', {
            workOrderNumber: 'WO-1',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-10T08:00:00.000Z',
            endDate: '2026-02-10T12:00:00.000Z',
            durationMinutes: 240,
            isMaintenance: false,
            dependsOnWorkOrderIds: []
          }),
          createWorkOrder('wo-2', {
            workOrderNumber: 'WO-2',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-10T10:00:00.000Z',
            endDate: '2026-02-10T12:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: []
          })
        ],
        workCenters: [
          createWorkCenter('wc-1', {
            name: 'Work Center 1',
            shifts: standardShifts,
            maintenanceWindows: []
          })
        ],
        manufacturingOrders: []
      };

      const result = service.reflow(input);

      expect(result.metrics).toBeDefined();
      expect(result.metrics?.totalDelayMinutes).toBeGreaterThanOrEqual(0);
      expect(result.metrics?.workOrdersAffected).toBe(result.changes.length);
    });
  });
});
