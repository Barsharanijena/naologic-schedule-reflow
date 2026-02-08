/**
 * Tests for dependency resolver
 */

import { DependencyResolver } from '../src/core/dependency-resolver';
import { WorkOrder } from '../src/types/common-types';
import { createWorkOrder } from '../src/models/work-order';

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;

  beforeEach(() => {
    resolver = new DependencyResolver();
  });

  describe('buildDependencyGraph', () => {
    it('should build graph with no dependencies', () => {
      const workOrders: WorkOrder[] = [
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
      ];

      const graph = resolver.buildDependencyGraph(workOrders);
      expect(graph.size).toBe(1);
      expect(graph.get('wo-1')?.parents).toEqual([]);
      expect(graph.get('wo-1')?.children).toEqual([]);
    });

    it('should build graph with dependencies', () => {
      const workOrders: WorkOrder[] = [
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
        })
      ];

      const graph = resolver.buildDependencyGraph(workOrders);
      expect(graph.get('wo-2')?.parents).toEqual(['wo-1']);
      expect(graph.get('wo-1')?.children).toEqual(['wo-2']);
    });

    it('should throw error for non-existent dependency', () => {
      const workOrders: WorkOrder[] = [
        createWorkOrder('wo-1', {
          workOrderNumber: 'WO-1',
          manufacturingOrderId: 'mo-1',
          workCenterId: 'wc-1',
          startDate: '2026-02-10T08:00:00.000Z',
          endDate: '2026-02-10T10:00:00.000Z',
          durationMinutes: 120,
          isMaintenance: false,
          dependsOnWorkOrderIds: ['wo-999']
        })
      ];

      expect(() => resolver.buildDependencyGraph(workOrders)).toThrow();
    });
  });

  describe('detectCycles', () => {
    it('should not detect cycle in linear dependency', () => {
      const workOrders: WorkOrder[] = [
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
        })
      ];

      const graph = resolver.buildDependencyGraph(workOrders);
      const cycle = resolver.detectCycles(graph);
      expect(cycle).toBeNull();
    });

    it('should detect simple cycle', () => {
      const workOrders: WorkOrder[] = [
        createWorkOrder('wo-1', {
          workOrderNumber: 'WO-1',
          manufacturingOrderId: 'mo-1',
          workCenterId: 'wc-1',
          startDate: '2026-02-10T08:00:00.000Z',
          endDate: '2026-02-10T10:00:00.000Z',
          durationMinutes: 120,
          isMaintenance: false,
          dependsOnWorkOrderIds: ['wo-2']
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
        })
      ];

      const graph = resolver.buildDependencyGraph(workOrders);
      const cycle = resolver.detectCycles(graph);
      expect(cycle).not.toBeNull();
      expect(cycle?.type).toBe('CIRCULAR_DEPENDENCY');
    });
  });

  describe('topologicalSort', () => {
    it('should sort work orders by dependencies', () => {
      const workOrders: WorkOrder[] = [
        createWorkOrder('wo-3', {
          workOrderNumber: 'WO-3',
          manufacturingOrderId: 'mo-1',
          workCenterId: 'wc-3',
          startDate: '2026-02-10T12:00:00.000Z',
          endDate: '2026-02-10T14:00:00.000Z',
          durationMinutes: 120,
          isMaintenance: false,
          dependsOnWorkOrderIds: ['wo-1', 'wo-2']
        }),
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
          dependsOnWorkOrderIds: []
        })
      ];

      const sorted = resolver.topologicalSort(workOrders);

      // wo-1 and wo-2 should come before wo-3
      const indexWo1 = sorted.findIndex(wo => wo.docId === 'wo-1');
      const indexWo2 = sorted.findIndex(wo => wo.docId === 'wo-2');
      const indexWo3 = sorted.findIndex(wo => wo.docId === 'wo-3');

      expect(indexWo3).toBeGreaterThan(indexWo1);
      expect(indexWo3).toBeGreaterThan(indexWo2);
    });

    it('should throw error for circular dependencies', () => {
      const workOrders: WorkOrder[] = [
        createWorkOrder('wo-1', {
          workOrderNumber: 'WO-1',
          manufacturingOrderId: 'mo-1',
          workCenterId: 'wc-1',
          startDate: '2026-02-10T08:00:00.000Z',
          endDate: '2026-02-10T10:00:00.000Z',
          durationMinutes: 120,
          isMaintenance: false,
          dependsOnWorkOrderIds: ['wo-2']
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
        })
      ];

      expect(() => resolver.topologicalSort(workOrders)).toThrow();
    });
  });

  describe('getChildren and getParents', () => {
    const workOrders: WorkOrder[] = [
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
      })
    ];

    it('should get parent work orders', () => {
      const parents = resolver.getParents('wo-2', workOrders);
      expect(parents).toHaveLength(1);
      expect(parents[0].docId).toBe('wo-1');
    });

    it('should get child work orders', () => {
      const children = resolver.getChildren('wo-1', workOrders);
      expect(children).toHaveLength(1);
      expect(children[0].docId).toBe('wo-2');
    });
  });
});
