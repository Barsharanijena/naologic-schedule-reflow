# Production Schedule Reflow System

A production scheduling algorithm that intelligently reschedules work orders when disruptions occur, respecting dependencies, work center conflicts, shift boundaries, and maintenance windows.

**Naologic Backend Engineer Challenge - Submission by Barsharani Jena**

---

## Quick Start

### Installation

```bash
npm install
```

### Run the Demo

```bash
npm run dev
```

This will run demonstration scenarios showing delay cascades and maintenance conflicts.

### Run Tests

```bash
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Build

```bash
npm run build
```

---

## Problem Overview

Manufacturing facilities face constant disruptions: work orders run longer than expected, machines go down for maintenance, materials arrive late. When a disruption happens, you can't just delay one work order in isolation - you need to reflow the entire schedule while respecting all constraints.

This system implements a **reflow algorithm** that produces valid schedules when disruptions occur.

---

## Design Philosophy

**Constraint Satisfaction is the Core Requirement**

My primary goal was to build a scheduler that produces VALID schedules where all hard constraints are met. A correct scheduler that respects constraints is worth far more than an "optimized" one that violates them.

**Correct Before Intelligent**

I chose a greedy forward-scheduling approach because it's simple, correct, and fast. This aligns with the principle of not optimizing prematurely. Get correctness right first, then optimize if needed.

**Key Principles:**
- Maintenance is SACRED - work orders marked `isMaintenance: true` are immovable; all regular work flows around them
- Dependencies must be satisfied - dependent work cannot start until all prerequisites complete
- Work centers are single-threaded - only one job at a time
- Work pauses outside shift hours - no overnight work, resumes next shift
- Validation proves correctness - the schedule must pass all constraint checks

---

## ERP Context & Domain Model

Manufacturing facilities operate on a three-tier hierarchy:

### 1. Manufacturing Order (the "what")
A customer order or production request.
- Example: "We need 500 units of PVC pipe by March 15th"
- Has a due date, item ID, and quantity
- Represents the overall production goal

### 2. Work Orders (the "how")
Discrete production steps to fulfill the Manufacturing Order.
- Example: For PVC pipe production:
  - Extrusion (4 hours on Line A)
  - Cooling (2 hours on Cooling Station)
  - Cutting (1 hour on Cutting Line B)
  - Quality Check (30 min on QC Station)
- Have dependencies - you can't cut before extruding
- Each has a duration, start/end time, and runs on a specific Work Center

### 3. Work Centers (the "where")
Physical machines or stations with real-world constraints.
- Single-threaded: Only one job at a time
- Operating hours: Defined shifts (example: Mon-Fri 8 AM-5 PM)
- Maintenance windows: Scheduled downtime that cannot be moved
- Examples: Extrusion Line 1, Cutting Station, Assembly Line

### When Disruption Occurs

Say Extrusion Line A breaks down for 2 hours. The reflow algorithm must:
1. Push the affected work order back by 2 hours
2. Cascade that delay through all dependencies
3. Avoid conflicts with other orders on those work centers
4. Respect shift boundaries (work pauses at 5 PM, resumes 8 AM)
5. Flow around any maintenance windows (sacred, immovable)

---

## Architecture

### High-Level Flow

```
Input (Current Schedule + Constraints)
    ↓
Topological Sort (Dependency Order)
    ↓
For Each Work Order:
  - Calculate Earliest Valid Start Time
  - Check Dependencies
  - Avoid Work Center Conflicts
  - Respect Shift Hours
  - Avoid Maintenance Windows
    ↓
Validation (Prove Correctness)
    ↓
Output (Valid Schedule + Changes + Metrics)
```

### Core Components

#### 1. ReflowService (`src/core/reflow-service.ts`)
Main scheduling algorithm that iterates through work orders in dependency order and calculates earliest valid start times using shift-aware scheduling.

#### 2. DependencyResolver (`src/core/dependency-resolver.ts`)
Builds dependency graph, detects circular dependencies using DFS-based cycle detection, and performs topological sorting using Kahn's algorithm for DAG operations.

**Why Topological Sort?**
Work order dependencies form a Directed Acyclic Graph (DAG). Topological sort gives us a valid linear ordering where every work order comes AFTER all its prerequisites. This guarantees we can schedule without violating dependencies and lets us detect impossible schedules (circular dependencies) early.

#### 3. ConstraintValidator (`src/core/constraint-validator.ts`)
Validates all constraints to prove correctness. Checks for dependency violations, work center conflicts, shift compliance, and maintenance window conflicts.

#### 4. Date Utilities (`src/utils/date-utils.ts`)
Shift-aware date calculations using Luxon. Handles work pausing outside shift hours, overlap detection, and maintenance window checks.

---

## Algorithm Approach

### Shift-Aware Scheduling

The most challenging aspect is calculating work duration across shift boundaries.

**Example**: A 120-minute work order starts Monday 4 PM, shift ends at 5 PM (Mon-Fri 8 AM-5 PM)
- Works 60 minutes Monday (4-5 PM)
- **Pauses** overnight
- Resumes Tuesday 8 AM
- Completes at 9 AM Tuesday

**Implementation** (`calculateEndDateWithShifts`):
```typescript
1. Start with current date/time
2. While remaining work > 0:
   a. Find shift for current day
   b. If no shift today → advance to next day
   c. If before shift start → jump to shift start
   d. If after shift end → advance to next day
   e. Calculate available minutes in current shift
   f. Consume available minutes
   g. If work remains → continue to next shift
3. Return final completion time
```

### Reflow Algorithm Steps

1. **Sort by Dependencies**: Use topological sort to process work orders in dependency order
2. **Calculate Earliest Start**: For each work order:
   - Check dependency completion times
   - Find next available slot on work center
   - Adjust to shift boundaries
   - Avoid maintenance windows (sacred)
3. **Validate**: Ensure final schedule satisfies all constraints

### Constraint Handling

| Constraint | Strategy |
|------------|----------|
| **Dependencies** | Process in topological order; start ≥ max(parent end dates) |
| **Work Center Conflicts** | Find next available time slot after existing bookings |
| **Shift Boundaries** | Use shift-aware date calculation; work pauses outside shifts |
| **Maintenance Windows** | Treat as immovable blocked time; find next available slot after |

---

## Validation & Proof of Correctness

After scheduling, the system validates EVERY constraint to prove the schedule is valid:

- **No overlapping work** on the same work center (single-threaded machines)
- **All dependencies satisfied** (dependent work starts AFTER all prerequisites complete)
- **Work only during shift hours** (no overnight work, no weekend work if no shifts defined)
- **Maintenance windows respected** (immovable, sacred - regular work flows around them)
- **No circular dependencies** (DAG validation catches impossible schedules)

This validation isn't optional - it's how we PROVE correctness. If validation fails, the system provides actionable feedback explaining exactly WHAT constraint failed and WHY the schedule can't be satisfied.

---

## Test Scenarios

I created 8 comprehensive scenarios to test different aspects of the scheduler.

### Small Scenarios (5-20 work orders - manually verifiable)

These scenarios are small enough to manually verify correctness by inspecting each work order:

1. **Delay Cascade** (`scenario-1-delay-cascade.json`)
   - Tests: One delayed order triggers chain reaction through dependencies
   - Validates: Dependency propagation

2. **Maintenance Conflict** (`scenario-2-maintenance-conflict.json`)
   - Tests: Work flows around immovable maintenance windows
   - Validates: Maintenance windows are respected (sacred)

3. **Complex Dependencies** (`scenario-3-complex-dependencies.json`)
   - Tests: Multiple manufacturing orders with interleaved dependencies
   - Validates: Multi-product workflows with parallel streams

4. **Diamond Dependencies** (`scenario-5-diamond-dependencies.json`)
   - Tests: A→C, B→C where C waits for BOTH A and B
   - Validates: Multiple dependencies converging on single work order
   - Disruption: Part A delayed 2 hours, Assembly must wait for both parts

5. **Impossible Schedule** (`scenario-6-impossible-schedule.json`)
   - Tests: Circular dependencies, maintenance conflicts, invalid constraints
   - Validates: Error detection with clear explanations of WHY scheduling fails

6. **Shift Boundary Spanning** (`scenario-7-shift-boundary-spanning.json`)
   - Tests: Work that pauses at 5 PM, resumes 8 AM next day
   - Validates: Overnight pausing, weekend handling, multi-day work

7. **Resource Contention** (`scenario-8-resource-contention.json`)
   - Tests: 8+ work orders competing for same bottleneck work center
   - Validates: No overlaps, intelligent packing, maintenance flow-around

### Large Scenario (performance testing)

8. **Large-Scale Test** (`scenario-4-large-scale-1000.json`)
   - Tests: 1,000 work orders with dependencies, conflicts, shift boundaries
   - Validates: Algorithm scales for production workloads
   - Performance target: Complete in <30 seconds

---

## Design Decisions & Trade-offs

### 1. Greedy vs. Optimal Scheduling

**What I Chose**: Greedy forward-scheduling (schedule each work order at earliest valid time)

**Why I Chose This**:
- Simple and understandable - easier to debug and maintain
- Correct - produces valid schedules that satisfy ALL constraints
- Fast - O(n log n) for topological sort, O(n) for scheduling
- Aligns with "correct before intelligent" principle
- Good enough for most real-world scenarios

**Alternatives I Considered**:
- Backtracking for optimal solutions - More complex, slower, harder to debug. Optimizes global delay but risks complexity bugs.
- Constraint programming (CP-SAT solver like Google OR-Tools) - Powerful but adds external dependency and learning curve.
- Genetic algorithms - Overkill for single-objective constraint satisfaction problem.

**Trade-off Decision**: I chose simplicity and correctness over global optimality. A valid schedule that respects all constraints is more valuable than an "optimized" schedule that violates constraints. Premature optimization is the root of many bugs.

### 2. Topological Sort (Kahn's Algorithm)

**What I Chose**: Kahn's algorithm for topological sorting

**Why It Works**:
- Work order dependencies form a Directed Acyclic Graph (DAG)
- Topological sort gives valid linear ordering where prerequisites come first
- Kahn's algorithm has O(V + E) time complexity - efficient
- Built-in cycle detection - catches circular dependencies early

**Alternative**: DFS-based topological sort has similar performance, but Kahn's algorithm is more intuitive for level-by-level processing.

### 3. Date Handling with Luxon

**What I Chose**: Luxon library for date calculations

**Why**:
- Robust timezone support (important for global manufacturing)
- Handles edge cases: weekends, holidays, DST transitions
- Immutable date objects prevent accidental mutations
- Better API than native JavaScript Date

**Alternative**: Manual date math is error-prone and doesn't handle timezones well.

---

## Known Limitations

### 1. Local Optimization
The greedy approach finds a valid schedule but may not minimize total delay globally. For example, if two orders compete for a work center, the algorithm schedules whichever comes first in topological order, not whichever minimizes downstream impact.

**Future Enhancement**: Implement branch-and-bound or constraint programming for global optimization.

### 2. Shift Simplifications
Currently assumes uniform shift structure (same hours every weekday). Doesn't handle:
- Split shifts (morning + evening with lunch break)
- Varying shift lengths by day (shorter Fridays)
- Holiday schedules

**Future Enhancement**: Support flexible shift definitions per day.

### 3. No Priority Levels
All work orders treated equally. Doesn't prioritize:
- Rush orders with tight due dates
- High-value customers
- Critical path items

**Future Enhancement**: Add priority field and use priority queue for scheduling order.

---

## Future Enhancements (@upgrade)

These improvements would enhance the system but weren't critical for proving correctness:

- [ ] **Global Optimization**: Implement branch-and-bound or genetic algorithms for minimal total delay
- [ ] **Priority Levels**: Support work order priorities (rush orders, due date urgency, customer tier)
- [ ] **Resource Constraints**: Handle limited resources (operators, materials, tooling)
- [ ] **Setup Time**: Account for setup/changeover time between different product types
- [ ] **Multi-Objective Optimization**: Optimize for multiple goals (delay, cost, utilization, due date compliance)
- [ ] **What-If Analysis**: Simulate different disruption scenarios and compare outcomes
- [ ] **Optimization Metrics**: Calculate total delay (HIGH priority), orders affected (MEDIUM priority), work center utilization (NICE-TO-HAVE)

---

## Testing

### Test Coverage

- **Date Utilities** (17 tests): Shift boundary calculations, maintenance overlap detection, time range operations, weekend/no-shift handling

- **Dependency Resolver** (8 tests): Graph construction, cycle detection, topological sorting, parent/child relationships

- **Reflow Service** (7 integration tests): Valid schedules (no changes needed), dependency cascades, work center conflicts, maintenance windows, optimization metrics

### Run Tests

```bash
# All tests
npm test

# With coverage report
npm run test:coverage

# Coverage threshold: 70% (branches, functions, lines, statements)
```

---

## Project Structure

```
naologic-schedule-reflow/
├── src/
│   ├── core/
│   │   ├── reflow-service.ts          # Main scheduling algorithm
│   │   ├── dependency-resolver.ts      # DAG operations & topological sort
│   │   └── constraint-validator.ts     # Constraint checking
│   ├── models/
│   │   ├── work-order.ts              # Work order helpers
│   │   ├── work-center.ts             # Work center helpers
│   │   └── manufacturing-order.ts     # Manufacturing order helpers
│   ├── utils/
│   │   └── date-utils.ts              # Shift-aware date calculations
│   ├── types/
│   │   └── common-types.ts            # TypeScript type definitions
│   └── index.ts                        # Entry point & demo
├── tests/
│   ├── date-utils.test.ts
│   ├── dependency-resolver.test.ts
│   └── reflow-service.test.ts
├── data/
│   ├── scenario-1-delay-cascade.json
│   ├── scenario-2-maintenance-conflict.json
│   ├── scenario-3-complex-dependencies.json
│   ├── scenario-4-large-scale-1000.json
│   ├── scenario-5-diamond-dependencies.json
│   ├── scenario-6-impossible-schedule.json
│   ├── scenario-7-shift-boundary-spanning.json
│   └── scenario-8-resource-contention.json
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

---

## Technology Stack

- **Language**: TypeScript 5.3
- **Runtime**: Node.js 20+
- **Testing**: Jest 29
- **Date Handling**: Luxon 3.4 (shift-aware calculations)
- **Build**: TypeScript Compiler (tsc)

---

## API Usage

```typescript
import { ReflowService } from './src/core/reflow-service';

const service = new ReflowService();

const result = service.reflow({
  workOrders: [...],      // Current work orders
  workCenters: [...],     // Work centers with shifts and maintenance
  manufacturingOrders: [...] // Manufacturing orders (context)
});

console.log(result.updatedWorkOrders);  // New schedule
console.log(result.changes);             // What changed
console.log(result.explanation);         // Why it changed
console.log(result.metrics);             // Optimization metrics
```

---

## Requirements Checklist

### Core Requirements
- ✓ Working reflow algorithm
- ✓ Handles dependencies (multiple parents supported)
- ✓ Handles work center conflicts
- ✓ Shift-aware scheduling (work pauses outside shifts)
- ✓ Maintenance window support (sacred, immovable)
- ✓ Sample data (8 scenarios covering all edge cases)
- ✓ Documentation (README with approach and trade-offs)
- ✓ TypeScript with proper types
- ✓ Clean code structure

### Bonus Features Implemented
- ✓ Automated test suite (30+ tests, 70% coverage threshold)
- ✓ DAG implementation with cycle detection
- ✓ Topological sorting (Kahn's algorithm)
- ✓ Comprehensive test scenarios (8 scenarios)
- ✓ Error detection for impossible schedules
- ✓ Validation proves correctness
- ✓ Documentation with explicit trade-offs

---

## Demo Videos

I created a comprehensive video walkthrough of the system:

### Main Demo Videos
1. [Overview & Architecture](https://www.loom.com/share/ad7df6d3fc514cf887c30ec3ca6401a0)
2. [Core Algorithm & Dependency Resolution](https://www.loom.com/share/62afcceeba6f4bce8b65678c9c002f1e)
3. [Shift-Aware Scheduling & Constraints](https://www.loom.com/share/ffe41c755fc4433185ab34f2f399fbbc)
4. [Test Scenarios & Validation](https://www.loom.com/share/93f6b28c091b4480898e20f414d0a76a)
5. [Maintenance Windows & Edge Cases](https://www.loom.com/share/7866c12e36b9430a8ea8d64a70d61069)
6. [Design Trade-offs & Future Enhancements](https://www.loom.com/share/bc75a2121939465c93364bca19b0395e)
7. [Performance Testing & Large-Scale Demo](https://www.loom.com/share/b5b954b903b84f8c8e13420065e42a03)

Videos cover:
- Problem understanding and ERP context
- Architecture walkthrough (WHY I chose each approach)
- Live demos of key scenarios
- Trade-offs and design decisions
- Validation proof of correctness

---

## Author

**Barsharani Jena**
Email: barsharanijena555@gmail.com

Submitted for: Naologic Backend Engineer Position
Date: February 2026

---

## License

MIT License - This is a take-home challenge submission.
