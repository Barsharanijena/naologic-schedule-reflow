# Production Schedule Reflow System

A production scheduling algorithm that intelligently reschedules work orders when disruptions occur, respecting dependencies, work center conflicts, shift boundaries, and maintenance windows.

**Naologic Backend Engineer Challenge - Submission by Barsharani Jena**

---

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Run the Demo

```bash
npm run dev
```

This will run two demonstration scenarios:
1. **Delay Cascade**: Shows how a delayed work order affects downstream dependencies
2. **Maintenance Conflict**: Demonstrates rescheduling around maintenance windows

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

## 📋 Problem Overview

Manufacturing facilities face constant disruptions:
- Work orders run longer than expected
- Machines go down for maintenance
- Work orders have dependencies (Order B can't start until Order A finishes)
- Different work centers have different shift schedules

This system implements a **reflow algorithm** that reschedules work orders to produce a valid schedule while respecting all constraints.

---

## 🏗️ Architecture

### High-Level Design

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
Output (Valid Schedule + Changes + Metrics)
```

### Core Components

1. **ReflowService** (`src/core/reflow-service.ts`)
   - Main scheduling algorithm
   - Iterates through work orders in dependency order
   - Calculates earliest valid start times
   - Handles shift-aware scheduling

2. **DependencyResolver** (`src/core/dependency-resolver.ts`)
   - Builds dependency graph
   - Detects circular dependencies (DFS-based cycle detection)
   - Topological sorting (Kahn's algorithm)
   - DAG operations

3. **ConstraintValidator** (`src/core/constraint-validator.ts`)
   - Validates all constraints
   - Checks for dependency violations
   - Detects work center conflicts
   - Verifies shift compliance
   - Checks maintenance window conflicts

4. **Date Utilities** (`src/utils/date-utils.ts`)
   - Shift-aware date calculations using Luxon
   - Work pauses outside shift hours
   - Overlap detection
   - Maintenance window checks

---

## 🎯 Algorithm Approach

### Key Algorithm: Shift-Aware Scheduling

The most challenging aspect is calculating work duration across shift boundaries:

**Example**: A 120-minute work order starts Monday 4 PM, shift ends at 5 PM (Mon-Fri 8 AM-5 PM)
- Works 60 minutes Monday (4-5 PM)
- **Pauses** overnight
- Resumes Tuesday 8 AM
- Completes at 9 AM

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
   - Avoid maintenance windows
3. **Validate & Return**: Ensure final schedule satisfies all constraints

### Constraint Handling

| Constraint | Strategy |
|------------|----------|
| **Dependencies** | Process in topological order; start ≥ max(parent end dates) |
| **Work Center Conflicts** | Find next available time slot after existing bookings |
| **Shift Boundaries** | Use shift-aware date calculation; work pauses outside shifts |
| **Maintenance Windows** | Treat as blocked time; find next available slot after maintenance |

---

## 📊 Sample Scenarios

### Scenario 1: Delay Cascade

**Setup**:
- WO-001 → WO-002 → WO-003 (dependency chain)
- WO-004 conflicts with WO-001 on same work center
- WO-004 runs 3 hours longer than expected

**Result**: Algorithm detects conflicts and reschedules WO-001, which cascades to WO-002 and WO-003.

### Scenario 2: Maintenance Conflict

**Setup**:
- Multiple work orders scheduled on Extrusion Line 2
- Scheduled maintenance: 1-3 PM
- WO-102 and WO-103 conflict with maintenance window

**Result**: Work orders rescheduled around maintenance window.

---

## 🧪 Testing

### Test Coverage

- ✅ **Date Utilities** (17 tests)
  - Shift boundary calculations
  - Maintenance overlap detection
  - Time range operations
  - Weekend/no-shift handling

- ✅ **Dependency Resolver** (8 tests)
  - Graph construction
  - Cycle detection
  - Topological sorting
  - Parent/child relationships

- ✅ **Reflow Service** (7 integration tests)
  - Valid schedules (no changes needed)
  - Dependency cascades
  - Work center conflicts
  - Maintenance windows
  - Optimization metrics

### Run Tests

```bash
# All tests
npm test

# With coverage report
npm run test:coverage

# Coverage threshold: 70% (branches, functions, lines, statements)
```

---

## 📁 Project Structure

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
│   └── scenario-2-maintenance-conflict.json
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

---

## 🎓 Key Learnings & Trade-offs

### Design Decisions

1. **Topological Sort (Kahn's Algorithm)**
   - ✅ Ensures dependencies processed in correct order
   - ✅ O(V + E) time complexity - efficient
   - Alternative: DFS-based sorting (similar performance)

2. **Greedy Slot Finding**
   - ✅ Simple and effective for most cases
   - ⚠️ May not find globally optimal solution
   - Trade-off: Simplicity vs. optimality

3. **Shift Calculation with Luxon**
   - ✅ Robust date handling with timezone support
   - ✅ Handles edge cases (weekends, holidays, DST)
   - Alternative: Manual date math (error-prone)

### Known Limitations

1. **Local Optimization**: Algorithm uses greedy approach - finds valid schedule but may not minimize total delay
2. **Shift Simplifications**: Assumes uniform shift structure; doesn't handle split shifts or varying shift lengths by day
3. **No Backtracking**: Once a work order is scheduled, it's not reconsidered (future: constraint propagation)

### Future Enhancements (`@upgrade`)

- [ ] **Global Optimization**: Implement branch-and-bound or genetic algorithms for minimal delay
- [ ] **Priority Levels**: Support work order priorities (rush orders, due date urgency)
- [ ] **Resource Constraints**: Handle limited resources (operators, materials)
- [ ] **Setup Time**: Account for setup time between different product types
- [ ] **Multi-Objective**: Optimize for multiple goals (delay, cost, utilization)
- [ ] **What-If Analysis**: Simulate different disruption scenarios

---

## 💻 Technology Stack

- **Language**: TypeScript 5.3
- **Runtime**: Node.js 20+
- **Testing**: Jest 29
- **Date Handling**: Luxon 3.4 (shift-aware calculations)
- **Build**: TypeScript Compiler (tsc)

---

## 📝 API Usage

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

## ✅ Requirements Checklist

### Core Requirements
- ✅ Working reflow algorithm
- ✅ Handles dependencies (multiple parents supported)
- ✅ Handles work center conflicts
- ✅ Shift-aware scheduling (work pauses outside shifts)
- ✅ Maintenance window support
- ✅ Sample data (2+ scenarios)
- ✅ Documentation (README with approach)
- ✅ TypeScript with proper types
- ✅ Clean code structure

### Bonus Features Implemented
- ✅ Automated test suite (25+ tests, 70% coverage threshold)
- ✅ DAG implementation with cycle detection
- ✅ Topological sorting
- ✅ Optimization metrics (delay, affected orders, utilization)
- ✅ Multiple test scenarios (3+ scenarios covered)
- ✅ Comprehensive documentation with trade-offs

---

## 🎥 Demo Video

[Loom video link will be added here]

Video covers:
- Code walkthrough
- Running both scenarios
- Algorithm explanation
- Output demonstration

---

## 🙋 Author

**Barsharani Jena**
Email: barsharanijena555@gmail.com

Submitted for: Naologic Backend Engineer Position
Date: February 2026

---

## 📄 License

MIT License - This is a take-home challenge submission.
