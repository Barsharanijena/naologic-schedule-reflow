/**
 * Edge case tests for the reflow system
 * Tests unusual inputs and boundary conditions
 */

import { ReflowService } from '../src/core/reflow-service';
import { ReflowInput } from '../src/types/common-types';
import { createWorkOrder } from '../src/models/work-order';
import { createWorkCenter } from '../src/models/work-center';
import { createManufacturingOrder } from '../src/models/manufacturing-order';

describe('Edge Cases', () => {
  let service: ReflowService;

  beforeEach(() => {
    service = new ReflowService();
  });

  const standardShifts = [
    { dayOfWeek: 1, startHour: 8, endHour: 17 }, // Monday
    { dayOfWeek: 2, startHour: 8, endHour: 17 }, // Tuesday
    { dayOfWeek: 3, startHour: 8, endHour: 17 }, // Wednesday
    { dayOfWeek: 4, startHour: 8, endHour: 17 }, // Thursday
    { dayOfWeek: 5, startHour: 8, endHour: 17 }, // Friday
  ];

  describe('Empty Input Arrays', () => {
    it('should handle empty work orders array', () => {
      const input: ReflowInput = {
        workOrders: [],
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
      expect(result.updatedWorkOrders).toHaveLength(0);
      expect(result.changes).toHaveLength(0);
      expect(result.explanation).toContain('No changes needed');
    });

    it('should handle empty work centers array', () => {
      const input: ReflowInput = {
        workOrders: [],
        workCenters: [],
        manufacturingOrders: []
      };

      const result = service.reflow(input);
      expect(result.updatedWorkOrders).toHaveLength(0);
      expect(result.changes).toHaveLength(0);
    });

    it('should handle completely empty input', () => {
      const input: ReflowInput = {
        workOrders: [],
        workCenters: [],
        manufacturingOrders: []
      };

      expect(() => service.reflow(input)).not.toThrow();
    });
  });

  describe('Zero-Duration Work Orders', () => {
    it('should handle zero-duration work order', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-1', {
            workOrderNumber: 'WO-1',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-10T08:00:00.000Z',
            endDate: '2026-02-10T08:00:00.000Z',
            durationMinutes: 0, // Zero duration!
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
      expect(result.updatedWorkOrders).toHaveLength(1);

      const wo = result.updatedWorkOrders[0];
      expect(wo.data.startDate).toBe(wo.data.endDate);
    });

    it('should handle zero-duration work order with dependencies', () => {
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
            endDate: '2026-02-10T10:00:00.000Z',
            durationMinutes: 0, 
            isMaintenance: false,
            dependsOnWorkOrderIds: ['wo-1']
          })
        ],
        workCenters: [
          createWorkCenter('wc-1', { name: 'WC1', shifts: standardShifts, maintenanceWindows: [] }),
          createWorkCenter('wc-2', { name: 'WC2', shifts: standardShifts, maintenanceWindows: [] })
        ],
        manufacturingOrders: []
      };

      const result = service.reflow(input);

      const wo1 = result.updatedWorkOrders.find(wo => wo.docId === 'wo-1')!;
      const wo2 = result.updatedWorkOrders.find(wo => wo.docId === 'wo-2')!;

      // Zero-duration wo-2 should still start after wo-1 ends
      expect(wo2.data.startDate >= wo1.data.endDate).toBe(true);
    });
  });

  describe('Work Orders Starting Outside Shift Hours', () => {
    it('should reschedule work order starting before shift begins', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-1', {
            workOrderNumber: 'WO-1',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-10T06:00:00.000Z', // 6 AM - before 8 AM shift start
            endDate: '2026-02-10T08:00:00.000Z',
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

      const wo = result.updatedWorkOrders[0];
      // Should be rescheduled to start at 8 AM
      expect(wo.data.startDate).toBe('2026-02-10T08:00:00.000Z');
    });

    it('should reschedule work order starting after shift ends', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-1', {
            workOrderNumber: 'WO-1',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-10T18:00:00.000Z', // 6 PM - after 5 PM shift end
            endDate: '2026-02-10T20:00:00.000Z',
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

      const wo = result.updatedWorkOrders[0];
      // Should be rescheduled to next day at 8 AM
      expect(wo.data.startDate).toBe('2026-02-11T08:00:00.000Z');
    });

    it('should reschedule work order starting on weekend', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-1', {
            workOrderNumber: 'WO-1',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-14T10:00:00.000Z', // Saturday - no shift
            endDate: '2026-02-14T12:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: []
          })
        ],
        workCenters: [
          createWorkCenter('wc-1', {
            name: 'Work Center 1',
            shifts: standardShifts, // Monday-Friday only
            maintenanceWindows: []
          })
        ],
        manufacturingOrders: []
      };

      const result = service.reflow(input);

      const wo = result.updatedWorkOrders[0];
      // Should be rescheduled to Monday at 8 AM
      expect(wo.data.startDate).toBe('2026-02-16T08:00:00.000Z');
    });
  });

  describe('Diamond Dependencies', () => {
    it('should handle diamond dependency pattern (A→C, B→C)', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-a', {
            workOrderNumber: 'WO-A',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-10T08:00:00.000Z',
            endDate: '2026-02-10T10:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: []
          }),
          createWorkOrder('wo-b', {
            workOrderNumber: 'WO-B',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-2',
            startDate: '2026-02-10T08:00:00.000Z',
            endDate: '2026-02-10T11:00:00.000Z',
            durationMinutes: 180,
            isMaintenance: false,
            dependsOnWorkOrderIds: []
          }),
          createWorkOrder('wo-c', {
            workOrderNumber: 'WO-C',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-3',
            startDate: '2026-02-10T11:00:00.000Z',
            endDate: '2026-02-10T13:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: ['wo-a', 'wo-b'] // Depends on BOTH A and B
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

      const woA = result.updatedWorkOrders.find(wo => wo.docId === 'wo-a')!;
      const woB = result.updatedWorkOrders.find(wo => wo.docId === 'wo-b')!;
      const woC = result.updatedWorkOrders.find(wo => wo.docId === 'wo-c')!;

      // WO-C must start after BOTH WO-A and WO-B complete
      expect(woC.data.startDate >= woA.data.endDate).toBe(true);
      expect(woC.data.startDate >= woB.data.endDate).toBe(true);

      // WO-C should start after the later of the two parents
      const laterParentEnd = woA.data.endDate > woB.data.endDate ? woA.data.endDate : woB.data.endDate;
      expect(woC.data.startDate).toBe(laterParentEnd);
    });

    it('should handle complex diamond with delayed parent', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-a', {
            workOrderNumber: 'WO-A',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-10T08:00:00.000Z',
            endDate: '2026-02-10T10:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: []
          }),
          createWorkOrder('wo-b', {
            workOrderNumber: 'WO-B',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-2',
            startDate: '2026-02-10T08:00:00.000Z',
            endDate: '2026-02-10T14:00:00.000Z', // Takes longer!
            durationMinutes: 360,
            isMaintenance: false,
            dependsOnWorkOrderIds: []
          }),
          createWorkOrder('wo-c', {
            workOrderNumber: 'WO-C',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-3',
            startDate: '2026-02-10T10:00:00.000Z', // Originally starts early
            endDate: '2026-02-10T12:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: ['wo-a', 'wo-b']
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

      const woB = result.updatedWorkOrders.find(wo => wo.docId === 'wo-b')!;
      const woC = result.updatedWorkOrders.find(wo => wo.docId === 'wo-c')!;

      // WO-C should be delayed to wait for WO-B (the slower one)
      expect(woC.data.startDate).toBe('2026-02-10T14:00:00.000Z');
      expect(result.changes.some(c => c.workOrderNumber === 'WO-C')).toBe(true);
    });
  });

  describe('Work Spanning Weekends', () => {
    it('should handle long-duration work order correctly with shift calculation', () => {
      // Test that calculateEndDateWithShifts correctly handles weekend spanning
      const { calculateEndDateWithShifts } = require('../src/utils/date-utils');

      const startDate = '2026-02-13T15:00:00.000Z'; // Friday 3 PM
      const durationMinutes = 360; // 6 hours

      // Should work 2 hours Friday (3-5 PM), skip weekend, resume Monday 8 AM, work 4 more hours
      const endDate = calculateEndDateWithShifts(startDate, durationMinutes, standardShifts);

      expect(endDate).toBe('2026-02-16T12:00:00.000Z'); // Monday 12 PM
    });

    it('should handle multiple work orders crossing weekend boundary', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-1', {
            workOrderNumber: 'WO-1',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-13T16:00:00.000Z', // Friday 4 PM
            endDate: '2026-02-13T17:00:00.000Z',
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: []
          }),
          createWorkOrder('wo-2', {
            workOrderNumber: 'WO-2',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-14T10:00:00.000Z', // Saturday (invalid)
            endDate: '2026-02-14T12:00:00.000Z',
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
          })
        ],
        manufacturingOrders: []
      };

      const result = service.reflow(input);

      const wo1 = result.updatedWorkOrders.find(wo => wo.docId === 'wo-1')!;
      const wo2 = result.updatedWorkOrders.find(wo => wo.docId === 'wo-2')!;

      // WO-1 should span Friday evening to Monday morning
      // WO-2 should start after WO-1, on Monday
      expect(wo2.data.startDate >= wo1.data.endDate).toBe(true);
      expect(wo2.data.startDate).toContain('2026-02-16'); // Monday
    });
  });

  describe('Single Work Order Edge Cases', () => {
    it('should handle single work order with no conflicts', () => {
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
        manufacturingOrders: []
      };

      const result = service.reflow(input);
      expect(result.changes).toHaveLength(0);
      expect(result.updatedWorkOrders[0].data.startDate).toBe('2026-02-10T08:00:00.000Z');
    });

    it('should handle work order with non-existent dependency gracefully', () => {
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
            dependsOnWorkOrderIds: ['wo-999'] // Non-existent!
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

      // Should throw error about non-existent dependency
      expect(() => service.reflow(input)).toThrow();
    });
  });

  describe('Very Long Duration Work Orders', () => {
    it('should handle work order spanning multiple weeks', () => {
      const input: ReflowInput = {
        workOrders: [
          createWorkOrder('wo-1', {
            workOrderNumber: 'WO-1',
            manufacturingOrderId: 'mo-1',
            workCenterId: 'wc-1',
            startDate: '2026-02-10T08:00:00.000Z',
            endDate: '2026-02-10T17:00:00.000Z',
            durationMinutes: 4500, // 75 hours = ~8.3 working days
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
      const wo = result.updatedWorkOrders[0];

      // Should complete without infinite loop
      expect(wo.data.endDate).toBeDefined();
      expect(wo.data.endDate > wo.data.startDate).toBe(true);
    });
  });
});
