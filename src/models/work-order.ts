/**
 * Work Order model helpers
 */

import { WorkOrder, WorkOrderData } from '../types/common-types';

export function createWorkOrder(
  docId: string,
  data: WorkOrderData
): WorkOrder {
  return {
    docId,
    docType: 'workOrder',
    data
  };
}

export function cloneWorkOrder(workOrder: WorkOrder): WorkOrder {
  return {
    ...workOrder,
    data: { ...workOrder.data, dependsOnWorkOrderIds: [...workOrder.data.dependsOnWorkOrderIds] }
  };
}
