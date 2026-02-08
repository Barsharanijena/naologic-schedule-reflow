/**
 * Test the large-scale scenario with 1000 work orders
 * Measures performance and validates the algorithm at scale
 */

import { ReflowService } from '../src/core/reflow-service';
import { ReflowInput } from '../src/types/common-types';
import largeScaleData from '../data/scenario-4-large-scale-1000.json';

console.log('🚀 Large-Scale Performance Test');
console.log('Testing reflow algorithm with 1000 work orders\n');

const service = new ReflowService();

console.log('📊 Input Statistics:');
console.log(`- Work Orders: ${largeScaleData.workOrders.length}`);
console.log(`- Work Centers: ${largeScaleData.workCenters.length}`);
console.log(`- Manufacturing Orders: ${largeScaleData.manufacturingOrders.length}`);

const withDeps = largeScaleData.workOrders.filter(wo => wo.data.dependsOnWorkOrderIds.length > 0);
console.log(`- Work Orders with Dependencies: ${withDeps.length}`);

const maintenanceWOs = largeScaleData.workOrders.filter(wo => wo.data.isMaintenance);
console.log(`- Maintenance Work Orders: ${maintenanceWOs.length}`);
console.log();

console.log('⏱️  Running reflow algorithm...');
const startTime = Date.now();

try {
  const result = service.reflow(largeScaleData as ReflowInput);
  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`✅ Completed in ${duration}ms (${(duration / 1000).toFixed(2)}s)\n`);

  console.log('📈 Results:');
  console.log(`- Total Work Orders: ${result.updatedWorkOrders.length}`);
  console.log(`- Work Orders Rescheduled: ${result.changes.length}`);
  console.log(`- Percentage Changed: ${Math.round((result.changes.length / result.updatedWorkOrders.length) * 100)}%`);
  console.log();

  if (result.metrics) {
    console.log('📊 Metrics:');
    console.log(`- Total Delay: ${result.metrics.totalDelayMinutes} minutes (${Math.round(result.metrics.totalDelayMinutes / 60)} hours)`);
    console.log(`- Average Delay per Order: ${Math.round(result.metrics.totalDelayMinutes / result.changes.length)} minutes`);
    console.log();

    console.log('🏭 Work Center Utilization:');
    const sortedUtil = Object.entries(result.metrics.workCenterUtilization)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Show top 10

    sortedUtil.forEach(([wcId, util]) => {
      const wc = largeScaleData.workCenters.find(w => w.docId === wcId);
      console.log(`  ${wc?.data.name || wcId}: ${util.toFixed(2)}%`);
    });
    console.log();
  }

  console.log('📝 Sample Changes (first 5):');
  result.changes.slice(0, 5).forEach((change, idx) => {
    console.log(`\n  ${idx + 1}. ${change.workOrderNumber}`);
    console.log(`     Delay: ${change.delayMinutes} minutes`);
    console.log(`     Reason: ${change.reason}`);
  });

  if (result.changes.length > 5) {
    console.log(`\n  ... and ${result.changes.length - 5} more changes`);
  }

  console.log('\n✅ Large-scale test completed successfully!');
  console.log(`\n⚡ Performance: ${Math.round(result.updatedWorkOrders.length / (duration / 1000))} work orders/second`);

} catch (error) {
  console.error('\n❌ Error during reflow:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
