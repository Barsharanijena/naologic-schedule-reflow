/**
 * Main entry point for the reflow system
 * Demonstrates usage with sample scenarios
 */

import { ReflowService } from './core/reflow-service';
import { ReflowInput } from './types/common-types';

// Import sample data
import delayCascadeData from '../data/scenario-1-delay-cascade.json';
import maintenanceConflictData from '../data/scenario-2-maintenance-conflict.json';
import complexDependenciesData from '../data/scenario-3-complex-dependencies.json';

function runScenario(name: string, data: ReflowInput) {
  console.log('\n' + '='.repeat(80));
  console.log(`SCENARIO: ${name}`);
  console.log('='.repeat(80));

  const service = new ReflowService();

  try {
    const result = service.reflow(data);

    console.log('\n📊 RESULTS:');
    console.log(result.explanation);

    if (result.changes.length > 0) {
      console.log('\n📝 CHANGES:');
      result.changes.forEach(change => {
        console.log(`\n  Work Order: ${change.workOrderNumber}`);
        console.log(`  Original: ${change.originalStartDate} → ${change.originalEndDate}`);
        console.log(`  Updated:  ${change.newStartDate} → ${change.newEndDate}`);
        console.log(`  Delay:    ${change.delayMinutes} minutes`);
        console.log(`  Reason:   ${change.reason}`);
      });
    }

    if (result.metrics) {
      console.log('\n📈 METRICS:');
      console.log(`  Total Delay: ${result.metrics.totalDelayMinutes} minutes`);
      console.log(`  Orders Affected: ${result.metrics.workOrdersAffected}`);
      console.log(`  Work Center Utilization:`);
      Object.entries(result.metrics.workCenterUtilization).forEach(([wcId, util]) => {
        console.log(`    - ${wcId}: ${util}%`);
      });
    }

    console.log('\n✅ Schedule is valid!');
  } catch (error) {
    console.error('\n❌ ERROR:', error instanceof Error ? error.message : error);
  }
}

// Run all scenarios
function main() {
  console.log('🚀 Production Schedule Reflow System');
  console.log('Naologic Backend Engineer Challenge\n');

  runScenario('Delay Cascade', delayCascadeData as ReflowInput);
  runScenario('Maintenance Conflict', maintenanceConflictData as ReflowInput);
  runScenario('Complex Dependencies with Maintenance', complexDependenciesData as ReflowInput);

  console.log('\n' + '='.repeat(80));
  console.log('All scenarios completed!');
  console.log('='.repeat(80) + '\n');
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { ReflowService };
export * from './types/common-types';
