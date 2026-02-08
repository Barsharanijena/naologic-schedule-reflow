/**
 * Manufacturing Order model helpers
 */

import { ManufacturingOrder, ManufacturingOrderData } from '../types/common-types';

export function createManufacturingOrder(
  docId: string,
  data: ManufacturingOrderData
): ManufacturingOrder {
  return {
    docId,
    docType: 'manufacturingOrder',
    data
  };
}

export function cloneManufacturingOrder(mo: ManufacturingOrder): ManufacturingOrder {
  return {
    ...mo,
    data: { ...mo.data }
  };
}
