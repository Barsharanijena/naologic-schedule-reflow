/**
 * Generate large-scale test data for performance testing
 * Creates 1000 work orders with realistic dependencies and constraints
 */

import * as fs from 'fs';
import { DateTime } from 'luxon';

// Configuration
const NUM_WORK_ORDERS = 1000;
const NUM_WORK_CENTERS = 20;
const NUM_MANUFACTURING_ORDERS = 100;
const DEPENDENCY_PROBABILITY = 0.3; // 30% chance of having a dependency
const MAX_DEPENDENCIES = 3;
const MAINTENANCE_WINDOWS_PER_CENTER = 2;

// Helper function to generate random date
function randomDate(start: DateTime, end: DateTime): string {
  const diff = end.diff(start, 'hours').hours;
  const randomHours = Math.floor(Math.random() * diff);
  return start.plus({ hours: randomHours }).toISO()!;
}

// Generate work centers
function generateWorkCenters(count: number) {
  const centers = [];
  const types = ['Extrusion', 'Mixing', 'Cutting', 'Packaging', 'Quality Control', 'Assembly'];

  for (let i = 1; i <= count; i++) {
    const type = types[i % types.length];
    const wcId = `wc-${type.toLowerCase()}-${Math.floor(i / types.length) + 1}`;

    // Standard shifts (Mon-Fri 8AM-5PM)
    const shifts = [
      { dayOfWeek: 1, startHour: 8, endHour: 17 },
      { dayOfWeek: 2, startHour: 8, endHour: 17 },
      { dayOfWeek: 3, startHour: 8, endHour: 17 },
      { dayOfWeek: 4, startHour: 8, endHour: 17 },
      { dayOfWeek: 5, startHour: 8, endHour: 17 },
    ];

    // Add some 24/7 operations (20% of centers)
    if (Math.random() < 0.2) {
      shifts.push(
        { dayOfWeek: 6, startHour: 8, endHour: 17 },
        { dayOfWeek: 0, startHour: 8, endHour: 17 }
      );
    }

    // Generate maintenance windows
    const maintenanceWindows = [];
    const startDate = DateTime.fromISO('2026-02-10T00:00:00.000Z');

    for (let j = 0; j < MAINTENANCE_WINDOWS_PER_CENTER; j++) {
      const maintStart = startDate.plus({ days: Math.floor(Math.random() * 20) + 1, hours: 13 });
      const maintEnd = maintStart.plus({ hours: 2 });

      maintenanceWindows.push({
        startDate: maintStart.toISO(),
        endDate: maintEnd.toISO(),
        reason: `Scheduled maintenance ${j + 1}`
      });
    }

    centers.push({
      docId: wcId,
      docType: 'workCenter',
      data: {
        name: `${type} Line ${Math.floor(i / types.length) + 1}`,
        shifts,
        maintenanceWindows
      }
    });
  }

  return centers;
}

// Generate manufacturing orders
function generateManufacturingOrders(count: number) {
  const orders = [];
  const items = ['PIPE-100MM', 'PIPE-150MM', 'PIPE-200MM', 'PIPE-250MM', 'PIPE-300MM',
                 'COMPOUND-A', 'COMPOUND-B', 'FITTING-LARGE', 'FITTING-SMALL'];

  for (let i = 1; i <= count; i++) {
    const moId = `mo-${String(i).padStart(4, '0')}`;
    const item = items[i % items.length];
    const quantity = Math.floor(Math.random() * 1000) + 100;
    const dueDate = DateTime.fromISO('2026-02-10T00:00:00.000Z')
      .plus({ days: Math.floor(Math.random() * 30) + 5 });

    orders.push({
      docId: moId,
      docType: 'manufacturingOrder',
      data: {
        manufacturingOrderNumber: `MO-${String(i).padStart(4, '0')}`,
        itemId: item,
        quantity,
        dueDate: dueDate.toISO()
      }
    });
  }

  return orders;
}

// Generate work orders
function generateWorkOrders(count: number, workCenterIds: string[], moIds: string[]) {
  const workOrders = [];
  const startDate = DateTime.fromISO('2026-02-10T08:00:00.000Z');

  for (let i = 1; i <= count; i++) {
    const woId = `wo-${String(i).padStart(4, '0')}`;
    const workCenterId = workCenterIds[i % workCenterIds.length];
    const moId = moIds[Math.floor(i / (count / moIds.length))];

    // Random duration between 30 minutes and 8 hours
    const durationMinutes = Math.floor(Math.random() * 450) + 30;

    // 2% of work orders are maintenance tasks
    const isMaintenance = Math.random() < 0.02;

    // Stagger start times
    const hoursOffset = Math.floor(i / 10) * 2; // Every 10 orders, add 2 hours
    let woStart = startDate.plus({ hours: hoursOffset });

    // Ensure maintenance work orders start within shift hours (8 AM - 5 PM)
    if (isMaintenance) {
      const hour = woStart.hour;
      if (hour < 8) {
        woStart = woStart.set({ hour: 8, minute: 0 });
      } else if (hour >= 16) { // Make sure it can fit before 5 PM
        woStart = woStart.plus({ days: 1 }).set({ hour: 8, minute: 0 });
      }
    }

    // Simple end calculation (will be recalculated by reflow algorithm)
    const woEnd = woStart.plus({ minutes: durationMinutes });

    // Add dependencies (to earlier work orders only)
    // Maintenance tasks cannot have dependencies since they can't be rescheduled
    const dependsOnWorkOrderIds: string[] = [];
    if (!isMaintenance && i > 1 && Math.random() < DEPENDENCY_PROBABILITY) {
      const numDeps = Math.floor(Math.random() * MAX_DEPENDENCIES) + 1;
      for (let j = 0; j < numDeps && j < i - 1; j++) {
        const depIndex = Math.max(1, i - Math.floor(Math.random() * 50) - 1);
        const depId = `wo-${String(depIndex).padStart(4, '0')}`;
        if (!dependsOnWorkOrderIds.includes(depId)) {
          dependsOnWorkOrderIds.push(depId);
        }
      }
    }

    workOrders.push({
      docId: woId,
      docType: 'workOrder',
      data: {
        workOrderNumber: isMaintenance ? `MAINT-${String(i).padStart(4, '0')}` : `WO-${String(i).padStart(4, '0')}`,
        manufacturingOrderId: moId,
        workCenterId,
        startDate: woStart.toISO(),
        endDate: woEnd.toISO(),
        durationMinutes,
        isMaintenance,
        dependsOnWorkOrderIds
      }
    });
  }

  return workOrders;
}

// Generate the complete dataset
function generateLargeScaleData() {
  console.log('Generating large-scale test data...');
  console.log(`- ${NUM_WORK_ORDERS} work orders`);
  console.log(`- ${NUM_WORK_CENTERS} work centers`);
  console.log(`- ${NUM_MANUFACTURING_ORDERS} manufacturing orders`);

  const workCenters = generateWorkCenters(NUM_WORK_CENTERS);
  const manufacturingOrders = generateManufacturingOrders(NUM_MANUFACTURING_ORDERS);
  const workCenterIds = workCenters.map(wc => wc.docId);
  const moIds = manufacturingOrders.map(mo => mo.docId);
  const workOrders = generateWorkOrders(NUM_WORK_ORDERS, workCenterIds, moIds);

  const data = {
    workOrders,
    workCenters,
    manufacturingOrders
  };

  // Save to file
  const outputPath = './data/scenario-4-large-scale-1000.json';
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`\n✅ Generated ${workOrders.length} work orders`);
  console.log(`✅ Saved to ${outputPath}`);

  // Statistics
  const withDependencies = workOrders.filter(wo => wo.data.dependsOnWorkOrderIds.length > 0).length;
  const maintenanceOrders = workOrders.filter(wo => wo.data.isMaintenance).length;
  const totalDependencies = workOrders.reduce((sum, wo) => sum + wo.data.dependsOnWorkOrderIds.length, 0);

  console.log('\n📊 Statistics:');
  console.log(`- Work orders with dependencies: ${withDependencies} (${Math.round(withDependencies/NUM_WORK_ORDERS*100)}%)`);
  console.log(`- Total dependencies: ${totalDependencies}`);
  console.log(`- Maintenance work orders: ${maintenanceOrders}`);
  console.log(`- Work centers: ${NUM_WORK_CENTERS}`);
  console.log(`- Manufacturing orders: ${NUM_MANUFACTURING_ORDERS}`);
  console.log(`- Total maintenance windows: ${NUM_WORK_CENTERS * MAINTENANCE_WINDOWS_PER_CENTER}`);
}

// Run the generator
generateLargeScaleData();
