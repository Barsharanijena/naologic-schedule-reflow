
/**
 * Work Center model helpers
 */

import { WorkCenter, WorkCenterData } from '../types/common-types';

export function createWorkCenter(
  docId: string,
  data: WorkCenterData
): WorkCenter {
  return {
    docId,
    docType: 'workCenter',
    data
  };
}

export function cloneWorkCenter(workCenter: WorkCenter): WorkCenter {
  return {
    ...workCenter,
    data: {
      ...workCenter.data,
      shifts: [...workCenter.data.shifts],
      maintenanceWindows: [...workCenter.data.maintenanceWindows]
    }
  };
}
