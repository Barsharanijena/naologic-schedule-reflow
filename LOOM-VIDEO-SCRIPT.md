# Loom Video Script: Production Schedule Reflow System

**Target Duration:** 8-10 minutes
**Audience:** Technical evaluators familiar with manufacturing/ERP systems

---

## 📋 PRE-RECORDING CHECKLIST

- [ ] Clean terminal (clear history)
- [ ] Open VS Code with project
- [ ] Have test scenarios ready to run
- [ ] Prepare browser with output visualization (if applicable)
- [ ] Test microphone and screen recording
- [ ] Close distracting apps/notifications
- [ ] Test all commands work before recording
- [ ] Set terminal font size to 16-18pt (readable in recording)
- [ ] Close unnecessary VS Code tabs

---

## 🎬 VIDEO STRUCTURE & WHAT TO SHOW

| Section | Time | Screen Display | Commands |
|---------|------|----------------|----------|
| 1. Introduction | 1-2 min | README.md or VS Code overview | None |
| 2. Architecture | 2-3 min | VS Code - show file structure & key files | None |
| 3. Live Demos | 3-4 min | Terminal - run tests, show outputs | npm run test commands |
| 4. Trade-offs | 1-2 min | VS Code - @upgrade comments in code | None |
| 5. Closing | 30 sec | Terminal or VS Code overview | None |

---

## 🎬 VIDEO STRUCTURE

### SECTION 1: Introduction & Problem Understanding (1-2 min)
### SECTION 2: Solution Architecture (2-3 min)
### SECTION 3: Live Demo & Testing (3-4 min)
### SECTION 4: Trade-offs & Future Improvements (1-2 min)

---

## 📝 DETAILED SCRIPT

---

### SECTION 1: INTRODUCTION & PROBLEM UNDERSTANDING (1-2 min)

**[🖥️ SCREEN: Show README.md or project overview in VS Code]**

**[📁 FILES TO HAVE OPEN:]**
- README.md (visible on screen)
- Or VS Code Explorer showing project structure

**[🎬 VISUAL ACTIONS:]**
1. Start with VS Code showing README.md or project root
2. Keep your face cam in corner (if using)
3. Use cursor to highlight key points as you speak

**[⚠️ NO COMMANDS - Just talking]**

#### What to Say:
```
"Hi, I'm [Your Name], and this is my implementation of the production
schedule reflow system. Let me start by explaining the problem and my approach.

In manufacturing, disruptions are constant - machines break down, maintenance
runs long, materials arrive late. When a work order is delayed, we can't just
push it back in isolation. We need to reflow the entire schedule while
satisfying ALL hard constraints.

To understand the domain: A Manufacturing Order is a customer request - like
'500 units of PVC pipe by March 15th'. This breaks down into Work Orders -
discrete production steps like Extrusion, Cooling, Cutting. Each Work Order
runs on a Work Center - a physical machine with real constraints.

The core challenges are:
1. Dependencies - Work Orders form a DAG where edges represent 'depends on'
2. Work center conflicts - Single-threaded machines, only one job at a time
3. Shift boundaries - Work pauses at 5 PM, resumes 8 AM next day
4. Maintenance windows - These are SACRED and immovable, everything flows around them
5. No circular dependencies - Must detect and reject invalid schedules

My philosophy: CONSTRAINT SATISFACTION is the core requirement. I focused on
producing CORRECT schedules first - valid schedules that meet all constraints
are worth far more than 'optimized' ones that violate them. This is correct
before intelligent."
```

**[VISUAL CUE: Show a simple diagram or scenario-1 JSON highlighting dependencies]**

---

### SECTION 2: SOLUTION ARCHITECTURE (2-3 min)

**[🖥️ SCREEN: VS Code - src/ directory]**

**[📁 VISUAL SETUP:]**
1. Open VS Code with Explorer sidebar visible (Cmd+B or Ctrl+B)
2. Expand src/ folder to show all subfolders
3. Keep file tree visible on left side

**[🎬 WHAT TO SHOW:]**

#### What to Say:
```
"Let me walk you through my architecture. I organized the code into
clear modules:"
```

**[👆 ACTION: Hover cursor over each folder as you mention it]**

#### File Structure to Display on Screen:
```
src/
├── core/
│   ├── scheduler.ts              ← Main scheduling engine
│   ├── dependency-resolver.ts    ← Topological sort & DAG validation
│   ├── constraint-validator.ts   ← Hard constraint checking
│   └── time-calculator.ts        ← Shift boundary logic
├── types/
│   └── index.ts                  ← Type definitions
└── index.ts                      ← Entry point
```

#### What to Say:
```
"Here's how the system works at a high level:"
```

---

**[🖥️ SCREEN: Open src/core/scheduler.ts]**

**[📁 ACTION: Click on src/core/scheduler.ts to open it]**

**[👆 WHAT TO SHOW:]**
- Scroll to the main `reflowSchedule` function
- Highlight the function signature (lines with export function)
- Use cursor to underline important parts

#### Lines to Highlight & Explain:
```typescript
// Show main reflow function signature (find this in your code)
export function reflowSchedule(
  workOrders: WorkOrder[],
  workCenters: WorkCenter[],
  disruptedWorkOrderId: string,
  newEndDate: Date
): ReflowResult

"The scheduler takes work orders, work centers, identifies which order
was disrupted, and calculates the new schedule."
```

**[⏱️ DURATION: 15 seconds on this file]**

---

**[🖥️ SCREEN: Open src/core/dependency-resolver.ts]**

**[📁 ACTION: Click on src/core/dependency-resolver.ts to open it]**

**[👆 WHAT TO SHOW:]**
1. First show the `topologicalSort` function signature
2. Then scroll to cycle detection logic
3. Use cursor to highlight key lines

#### What to Say:
```
"Step 1: Dependency Resolution using Topological Sorting.

WHY topological sort? Because work order dependencies form a Directed Acyclic
Graph - a DAG. Each node is a work order, and edges represent 'depends on'
relationships. Topological sort gives us a valid linear ordering where every
work order comes AFTER all its prerequisites.

This guarantees:
- We can schedule without violating dependencies
- We detect impossible schedules (circular dependencies) early
- We process work in the correct order

Let me show you:"
```

#### Lines to Show:
```typescript
// Show topological sort function
export function topologicalSort(workOrders: WorkOrder[]): WorkOrder[]

// Show cycle detection
if (hasCycle) {
  throw new Error(`Circular dependency detected: ${cycle.join(' → ')}`);
}

"If there's a circular dependency - like A→B→C→A - that's NOT a DAG,
there's no valid ordering, and scheduling is impossible. The system detects
this upfront and explains WHY the schedule can't be satisfied. This is
critical for giving operators actionable feedback."
```

---

**[🖥️ SCREEN: Open src/core/time-calculator.ts]**

**[📁 ACTION: Click on src/core/time-calculator.ts to open it]**

**[👆 WHAT TO SHOW:]**
- Find the `calculateEndTime` function
- Show how it handles shift boundaries
- Highlight the logic that pauses/resumes work

**[⏱️ DURATION: 20 seconds on this file]**

#### What to Say:
```
"Step 2: Time Calculation with Shift Boundaries. This is where it gets
interesting. Work doesn't run 24/7 - it pauses at 5 PM and resumes at 8 AM."
```

#### Lines to Show:
```typescript
// Show shift boundary spanning logic
export function calculateEndTime(
  startTime: Date,
  durationMinutes: number,
  shifts: Shift[]
): Date

"For example, if a 4-hour job starts at 3 PM, it works for 2 hours until
5 PM, pauses overnight, and resumes at 8 AM the next day for the remaining
2 hours. The system automatically handles weekends too."
```

---

**[🖥️ SCREEN: Open src/core/constraint-validator.ts]**

**[📁 ACTION: Click on src/core/constraint-validator.ts to open it]**

**[👆 WHAT TO SHOW:]**
1. Show the main `validateSchedule` function
2. Scroll through to show the different check functions:
   - checkWorkCenterOverlaps()
   - checkDependencySatisfaction()
   - checkShiftCompliance()
   - checkMaintenanceConflicts()
3. Use cursor to point at each one as you mention it

**[⏱️ DURATION: 25 seconds on this file]**

#### What to Say:
```
"Step 3: Constraint Validation - PROOF of correctness.

After scheduling, I validate every single constraint to PROVE the schedule
is valid:
- ✓ No overlapping work on the same work center (single-threaded machines)
- ✓ All dependencies satisfied (dependent work starts AFTER prerequisites)
- ✓ Work only during shift hours (no work at night or weekends)
- ✓ Maintenance windows respected (maintenance is SACRED - immovable)
- ✓ No circular dependencies (DAG validation)

This isn't optional - it's how we PROVE correctness. If any constraint is
violated, the system reports exactly WHAT failed and WHY, giving operators
actionable feedback to fix the issue."
```

#### Lines to Show:
```typescript
// Show validation function
export function validateSchedule(
  workOrders: WorkOrder[],
  workCenters: WorkCenter[]
): ValidationResult

// Show specific checks
- checkWorkCenterOverlaps()
- checkDependencySatisfaction()
- checkShiftCompliance()
- checkMaintenanceConflicts()
```

---

### SECTION 3: LIVE DEMO & TESTING (3-4 min)

**[🖥️ SCREEN: Switch to Terminal]**

**[📁 SETUP:]**
1. Open a clean terminal window
2. Make sure you're in project root: `/Users/barshatfg/Downloads/naologic-schedule-reflow`
3. Run `clear` to clean terminal history

**[👆 WHAT TO SHOW: First, show data/ directory]**

```bash
# Show all test scenarios
ls -la data/
```

**[💬 WHILE SHOWING: Say this]**

#### What to Say:
```
"Now let me demonstrate correctness with real test cases. I've created 8
scenarios covering all the edge cases mentioned:

For PROVING correctness: Small scenarios with 5-20 work orders - small enough
to manually verify the output is correct. I can look at each work order and
confirm dependencies are satisfied, no overlaps, work within shifts.

For PERFORMANCE: A large-scale test with 1,000 work orders to demonstrate
the algorithm scales for production workloads.

The scenarios test:
- Delay cascade through dependencies
- Diamond dependencies (A→C, B→C where C waits for BOTH)
- Shift boundary spanning (overnight pausing)
- Resource contention (bottleneck work centers)
- Maintenance collisions (work flows around sacred maintenance)
- Impossible schedules (detect and explain WHY they fail)

Let me show you three key demonstrations:"
```

---

#### DEMO 1: Diamond Dependencies (Scenario 5)

**[🖥️ SCREEN: Briefly show the scenario file in VS Code]**

**[📁 ACTION: Open data/scenario-5-diamond-dependencies.json]**

**[👆 WHAT TO SHOW: Scroll to show:]**
1. WO-001 (Part A) - no dependencies
2. WO-002 (Part B) - no dependencies
3. WO-003 (Assembly) - dependsOnWorkOrderIds: ["wo-001", "wo-002"]
4. Point at the two dependencies with cursor

**[⏱️ DURATION: 10 seconds - don't spend too long here]**

#### What to Say:
```
"First, diamond dependencies. This is where two independent work orders -
Part A and Part B - both feed into an assembly step that waits for BOTH."
```

**[VISUAL: Draw on screen or show diagram]**
```
    Part A (2h)      Part B (2h)
         \              /
          \            /
           v          v
         Assembly (3h) ← waits for BOTH
```

#### What to Say:
```
"The disruption: Part A is delayed by 2 hours. Even though Part B finishes
on time, the assembly must wait for the delayed Part A. Let's run it."
```

**[🖥️ SCREEN: Switch back to Terminal]**

**[⌨️ COMMAND TO RUN:]**

```bash
# Run scenario 5 test
npm run test:scenario:5

# OR if you don't have npm scripts set up:
node dist/index.js --scenario=5

# OR if running TypeScript directly:
npx ts-node src/index.ts --scenario=5
```

**[⏳ WAIT: Let the command complete and show output]**

**[👆 WHAT TO HIGHLIGHT IN OUTPUT: Use cursor to point at these lines]**

```
Expected Output to Show:
✓ Part A (WO-001): Original 08:00-10:00 → New 08:00-12:00 (2h delay)
✓ Part B (WO-002): 08:00-10:00 (NO CHANGE - unaffected)
✓ Assembly (WO-003): Original 10:00-13:00 → New 12:00-15:00 (waits for Part A)
✓ QC (WO-004): Original 13:00-14:00 → New 15:00-16:00 (cascades)

Validation Results:
✓ No work center overlaps
✓ All dependencies satisfied
✓ Work within shift hours
✓ Total delay: 2 hours
```

**[💬 AS YOU POINT AT OUTPUT:]**

#### What to Say:
```
"Perfect! The scheduler correctly identified that Assembly needs BOTH
dependencies, not just one. See here - Part B finished at 10:00, but
Assembly had to wait until 12:00 for Part A. That's correct behavior
for diamond dependencies. The 2-hour delay cascaded through QC as well."
```

**[⏱️ DURATION: 45 seconds for this demo]**

---

#### DEMO 2: Shift Boundary Spanning (Scenario 7)

**[🖥️ SCREEN: Optional - briefly show scenario file]**

**[📁 OPTIONAL: Open data/scenario-7-shift-boundary-spanning.json for 5 seconds]**
- Show WO-SINGLE-SPAN with 240 minutes duration
- Show shift hours: 8-17 (8 AM to 5 PM)

#### What to Say:
```
"Second test: shift boundary spanning. Here's a 4-hour job starting at
3 PM, but the shift ends at 5 PM. Work doesn't run overnight - it must
pause and resume."
```

**[🖥️ SCREEN: Switch to Terminal]**

**[⌨️ COMMAND TO RUN:]**

```bash
# Run scenario 7 test
npm run test:scenario:7

# OR:
node dist/index.js --scenario=7
```

**[👆 WHAT TO HIGHLIGHT IN OUTPUT:]**

```
Expected Output:
✓ WO-SINGLE-SPAN (4 hours total):
  Day 1 (Monday):
    - Start: 15:00 (3 PM)
    - Work: 15:00 - 17:00 (2 hours)
    - PAUSE: Shift ends at 17:00
  Day 2 (Tuesday):
    - Resume: 08:00 (8 AM)
    - Work: 08:00 - 10:00 (2 hours)
    - End: 10:00

✓ WO-WEEKEND-SPAN:
  Friday 15:00 → PAUSE Friday 17:00 → Resume Monday 08:00
```

**[💬 AS YOU POINT AT OUTPUT:]**

#### What to Say:
```
"See how it pauses at 5 PM and resumes at 8 AM? The system automatically
calculates work time and pause time. And look at this weekend example -
if work starts Friday afternoon, it pauses for the entire weekend and
resumes Monday morning. This is critical for manufacturing schedules."
```

**[⏱️ DURATION: 45 seconds for this demo]**

---

#### DEMO 3: Resource Contention (Scenario 8)

**[🖥️ SCREEN: Optional - briefly show scenario file]**

**[📁 OPTIONAL: Open data/scenario-8-resource-contention.json for 5 seconds]**
- Show multiple WOs all with same workCenterId: "wc-bottleneck"
- Show maintenance WO with isMaintenance: true

#### What to Say:
```
"Third test: resource contention. This is a bottleneck scenario - 8 work
orders all competing for the same work center, PLUS an immovable maintenance
window from 1-2 PM. This tests conflict resolution."
```

**[🖥️ SCREEN: Switch to Terminal]**

**[⌨️ COMMAND TO RUN:]**

```bash
# Run scenario 8 test
npm run test:scenario:8

# OR:
node dist/index.js --scenario=8
```

**[👆 WHAT TO HIGHLIGHT IN OUTPUT: Use cursor to show timeline]**

```
Expected Output (Bottleneck Work Center Schedule):
✓ WO-CONTENTION-1: 08:00 - 10:00 (first in queue)
✓ WO-CONTENTION-2: 10:00 - 12:30 (rescheduled from 08:00)
✓ WO-CONTENTION-3: 12:30 - 13:00 (partial, then hits maintenance)
✓ MAINTENANCE:      13:00 - 14:00 ⚠️  IMMOVABLE - SACRED
✓ WO-CONTENTION-3: 14:00 - 14:30 (resumes after maintenance)
✓ WO-CONTENTION-4: 14:30 - 17:00 (flows around maintenance)
✓ WO-CONTENTION-5: Next day 08:00 - 10:30 (spills over)

Validation:
✓ No overlaps on wc-bottleneck
✓ Maintenance window protected
✓ All work within shifts
```

**[💬 AS YOU POINT AT OUTPUT:]**

#### What to Say:
```
"Look at this timeline. Every work order is serially arranged with NO overlaps -
the work center can only handle one job at a time, and the scheduler respects
that.

And see the maintenance window here? That's SACRED - marked isMaintenance: true,
it cannot be moved. All regular work must flow around it. Notice how WO-3 pauses,
maintenance runs, then WO-3 resumes. That's correct constraint handling.

This demonstrates three things:
1. No work center conflicts - constraint satisfied ✓
2. Maintenance is immovable - constraint satisfied ✓
3. Intelligent scheduling that packs work efficiently within constraints"
```

**[⏱️ DURATION: 60 seconds for this demo]**

---

#### DEMO 4: Impossible Schedule (Scenario 6) - ⭐ Optional but impressive

**[🖥️ SCREEN: Terminal]**

**[💡 TIP: Include this if you have time - shows error handling]**

**[⌨️ COMMAND TO RUN:]**

```bash
# Run scenario 6 test - this should FAIL with errors
npm run test:scenario:6

# OR:
node dist/index.js --scenario=6
```

**[👆 WHAT TO HIGHLIGHT IN OUTPUT: Error messages]**

```
Expected Errors (this is CORRECT behavior):
❌ ERROR: Circular dependency detected: WO-CIRCULAR-A → WO-CIRCULAR-B → WO-CIRCULAR-C → WO-CIRCULAR-A
   Reason: Dependencies form a cycle, no valid topological ordering exists

❌ ERROR: Work order WO-CONFLICT cannot be scheduled
   Reason: Overlaps with immovable maintenance window (13:00-14:00)

❌ ERROR: Work order WO-OUTSIDE-SHIFTS scheduled on Saturday
   Reason: Work center only operates Mon-Fri (no Saturday shifts)

❌ IMPOSSIBLE: Cannot satisfy all constraints
```

**[💬 AS YOU POINT AT ERRORS:]**

#### What to Say:
```
"And here's the error handling - equally important as success cases.
This scenario has circular dependencies and other impossible constraints.

See how the system doesn't just fail? It explains exactly WHY the schedule
is impossible. This gives operators actionable feedback:
- 'Remove dependency from C to A to break the cycle'
- 'Reschedule WO-CONFLICT to avoid maintenance window'
- 'Move Saturday work to Friday or Monday'

This is critical for production use - clear error messages save hours of debugging."
```

**[⏱️ DURATION: 30 seconds - keep this quick]**

---

#### DEMO 5: Large-Scale Performance (Scenario 4)

**[🖥️ SCREEN: Terminal]**

**[💡 PURPOSE: Show scalability for production workloads]**

#### What to Say:
```
"Finally, let's test performance with 1,000 work orders. This demonstrates
the algorithm scales for real production environments."
```

**[⌨️ COMMAND TO RUN:]**

```bash
# Run with time measurement
time npm run test:scenario:4

# OR:
time node dist/index.js --scenario=4

# OR if no npm script:
time npx ts-node src/index.ts --scenario=4
```

**[⏳ WAIT: This may take 10-30 seconds - that's fine, keep talking]**

**[💬 WHILE IT RUNS:]**
```
"This scenario has 1,000 work orders with dependencies, work center conflicts,
and shift boundaries. The algorithm is processing all of them right now..."
```

**[👆 WHAT TO HIGHLIGHT IN OUTPUT:]**

```
Expected Output:
Processing 1,000 work orders...
✓ Topological sort completed
✓ Schedule generated
✓ Validation passed
  - 0 work center overlaps
  - All dependencies satisfied
  - All work within shifts

Performance:
Time: 15.3 seconds  ← Point at this
Memory: Peak 145 MB
Orders processed: 1,000
Orders rescheduled: 347
```

**[💬 AFTER COMPLETION:]**

#### What to Say:
```
"Done! The scheduler completed 1,000 work orders in [X] seconds with all
constraints validated. This demonstrates the algorithm scales well for
production workloads. The topological sort is O(n log n), scheduling is
O(n), and validation is O(n²) for overlaps - efficient enough for
real-world use.

This meets the performance baseline - candidates typically aim for
1,000-3,000 work orders, and we're handling that comfortably."
```

**[⏱️ DURATION: 45 seconds including execution time]**

---

### SECTION 4: TRADE-OFFS & FUTURE IMPROVEMENTS (1-2 min)

**[🖥️ SCREEN: Switch back to VS Code]**

**[💡 CRITICAL: This section shows you can explain WHY - Oliver's #1 criteria]**

#### What to Say:
```
"Let me share some architectural decisions and trade-offs I made. This is
where I'll explain WHY I chose certain approaches and what I'd improve
given more time."
```

**[📁 FILES TO OPEN: Open these files and scroll to @upgrade comments]**

---

#### Key Points to Cover:

##### 1. Scheduling Algorithm Choice

**[🖥️ SCREEN: Open src/core/scheduler.ts]**

**[📁 ACTION:]**
1. Open src/core/scheduler.ts
2. Scroll to find your @upgrade comment about scheduling algorithm
3. Highlight the comment with cursor

**[👆 WHAT TO SHOW: Your @upgrade comment should look like this:]**

```typescript
// @upgrade: Currently using greedy forward scheduling
// PROS: Simple, correct, fast O(n log n)
// Could explore for optimization:
// - Backtracking for optimal solutions (more complex, slower)
// - Constraint programming (CP-SAT solver like Google OR-Tools)
// - Genetic algorithms for multi-objective optimization
// Trade-off: Correctness > Optimization (don't optimize prematurely)
```

**[💬 AS YOU POINT AT CODE:]**

#### What to Say:
```
"I chose a greedy forward-scheduling approach - here's WHY:

PROS:
- Simple and understandable (easier to debug and maintain)
- Correct - produces valid schedules that satisfy all constraints
- Fast - O(n log n) for topological sort, linear for scheduling
- Good enough - doesn't optimize prematurely

ALTERNATIVES I considered:
- Backtracking for optimal solutions - More complex, slower, harder to debug
- Constraint programming (CP-SAT solver) - Powerful but adds external dependency
- Genetic algorithms - Overkill for single-objective problem

The key principle: Don't optimize prematurely. A correct scheduler that
produces valid schedules is worth FAR more than an 'optimized' one that
violates constraints. Greedy gives us correct schedules - that's the core
requirement. We can always add optimization metrics later."
```

**[⏱️ DURATION: 20 seconds on this topic]**

---

##### 2. Priority Handling

**[🖥️ SCREEN: Stay in scheduler.ts or open types/index.ts]**

**[📁 ACTION: Find @upgrade comment about priority handling]**

**[👆 WHAT TO SHOW:]**

```typescript
// @upgrade: Add priority field to work orders
// Current: Schedules in topological order + FIFO (first-come-first-served)
// Enhancement: Priority queue with ranking:
//   - Due date proximity (urgent orders first)
//   - Order value (high-value customers prioritized)
//   - Customer tier (VIP customers get preference)
// Implementation: Replace FIFO queue with PriorityQueue<WorkOrder>
```

**[💬 AS YOU POINT AT CODE:]**

#### What to Say:
```
"Right now, scheduling is first-come-first-served within constraint
boundaries. Adding priority handling would let us favor urgent orders
with tight due dates. I'd add a priority field and use a priority queue
instead of FIFO."
```

**[⏱️ DURATION: 15 seconds on this topic]**

---

##### 3. Metrics & Optimization

**[🖥️ SCREEN: Open src/core/metrics.ts or relevant file]**

**[📁 ACTION: Find @upgrade comment about metrics]**

**[👆 WHAT TO SHOW:]**

```typescript
// @upgrade: Calculate optimization metrics
// Priority based on feedback:
// - HIGH: Total delay = sum(new_end - original_end) for all affected orders
// - MEDIUM: Orders affected = count of rescheduled orders
// - NICE: Work center utilization = working_minutes / available_shift_minutes
//
// Rationale: Focused on correctness first per requirements.
// These metrics would help operators understand disruption impact.
```

**[💬 AS YOU POINT AT CODE:]**

#### What to Say:
```
"I focused on constraint satisfaction first - getting valid schedules right.
The next step would be optimization metrics with these priorities:

HIGH PRIORITY: Total delay introduced
- sum(new_end - original_end) for all affected orders
- Tells us the downstream impact of disruptions

MEDIUM PRIORITY: Number of work orders affected
- Count of rescheduled orders
- Fewer cascading changes = more stable schedule

NICE-TO-HAVE: Work center utilization
- working_minutes / available_shift_minutes
- Shows efficiency and bottlenecks

The key: Get correctness first, THEN optimize. These metrics would help
operators understand disruption impact and make better decisions."
```

##### 4. Setup Time (Advanced)
```typescript
// @upgrade: Add setup time when switching between different products
// Would require: product_type field on work orders
// Logic: if (prev_product !== current_product) { add setup_time }
```

#### What to Say:
```
"In real manufacturing, switching between different products on the same
machine takes time - cleaning, recalibration, etc. I'd add setup time
calculation to make this more realistic, but it wasn't in the core
requirements."
```

---

### SECTION 5: CLOSING (30 sec)

**[SCREEN: Show project structure or README]**

#### What to Say:
```
"To summarize my approach:

CORE ACHIEVEMENT: Constraint satisfaction - producing VALID schedules
- ✅ All dependencies satisfied (topological sort on DAG)
- ✅ No work center overlaps (single-threaded machines)
- ✅ Work only during shifts (overnight pausing handled)
- ✅ Maintenance windows respected (sacred, immovable)
- ✅ Circular dependencies detected and rejected

ARCHITECTURE DECISIONS:
- ✅ Correct before intelligent (greedy is simple, fast, correct)
- ✅ Topological sort for dependency resolution (proven approach for DAGs)
- ✅ Comprehensive validation to PROVE correctness

TESTING STRATEGY:
- ✅ Small scenarios (5-20 WOs) for manual verification
- ✅ Large scenario (1,000 WOs) for performance validation
- ✅ All edge cases covered (diamond deps, spanning, contention, impossible)

TRADE-OFFS DOCUMENTED:
- ✅ @upgrade comments for future improvements
- ✅ Explicit about what I chose and WHY
- ✅ Optimization metrics identified but correctness prioritized

The code is well-documented, proven correct through validation, and ready
for production use. Thanks for watching!"
```

**[End recording]**

---

## 🎯 OLIVER'S REQUIREMENTS CHECKLIST

**These are the CRITICAL points Oliver wants to see - make sure you hit ALL of them:**

### ✅ Core Requirements (MUST HAVE)
- [ ] **"Constraint satisfaction is the core requirement"** - Say this explicitly in Section 1 (0:30)
- [ ] **"Correct before intelligent"** - Use these exact words in Section 4 (8:00)
- [ ] **"Don't optimize prematurely"** - Mention in Section 4 (8:30)
- [ ] **Topological sort + explain WHY it works** - Section 2 (3:00) - explain DAG concept
- [ ] **Maintenance is SACRED/immovable** - Say this 2-3 times (Section 1, Demo 3)
- [ ] **Explain WHY not just WHAT** - For every architectural decision, explain reasoning

### ✅ ERP Understanding (HIGH PRIORITY)
- [ ] **Manufacturing Order = "what"** (customer order) - Section 1 (0:30)
- [ ] **Work Orders = "how"** (production steps with dependencies) - Section 1 (0:30)
- [ ] **Work Centers = "where"** (physical machines with constraints) - Section 1 (0:45)

### ✅ Validation & Proof (CRITICAL)
- [ ] **List all 5 constraints explicitly** - Section 2 (4:00)
- [ ] **Show validation proves correctness** - Section 2 (4:15)
- [ ] **Demo outputs show constraint satisfaction** - Section 3 (all demos)

### ✅ Testing Strategy (HIGH PRIORITY)
- [ ] **Small scenarios for manual verification** - Section 3 (5:00)
- [ ] **Large scenario for performance** - Section 3 (7:00)
- [ ] **Cover all required scenarios:** diamond deps, shift spanning, contention, maintenance, impossible

### ✅ Trade-offs (CRITICAL)
- [ ] **State what you chose (greedy)** - Section 4 (8:00)
- [ ] **State alternatives you considered** - Section 4 (8:10)
- [ ] **Explain WHY you chose greedy** - Section 4 (8:15)
- [ ] **Show @upgrade comments in code** - Section 4 (8:30)

### ✅ Optimization Metrics (MEDIUM PRIORITY)
- [ ] **Total delay = HIGH priority** - Section 4 (9:00)
- [ ] **Orders affected = MEDIUM priority** - Section 4 (9:05)
- [ ] **Utilization = NICE-TO-HAVE** - Section 4 (9:10)
- [ ] **But correctness comes first** - Section 4 (9:15)

### ✅ Key Phrases to Use (Oliver's Words)
- [ ] "Constraint satisfaction is the core requirement"
- [ ] "Correct before intelligent"
- [ ] "Don't optimize prematurely"
- [ ] "Valid schedules are worth more than optimized ones that violate constraints"
- [ ] "Maintenance is sacred"
- [ ] "Topological sorting for dependency resolution"
- [ ] "Dependencies form a DAG"
- [ ] "Small enough to manually verify correctness"

---

## 📊 VISUAL AIDS TO PREPARE (Optional but Helpful)

### 1. Dependency Diagram for Diamond Pattern
```
    Part A (2h)      Part B (2h)
         \              /
          \            /
           v          v
         Assembly (3h)
              |
              v
           QC (1h)
```

### 2. Shift Boundary Visualization
```
Monday 3PM                5PM              Tuesday 8AM           10AM
|--------------------------|               |---------------------|
     Work (2 hours)         PAUSE OVERNIGHT      Work (2 hours)
```

### 3. Resource Contention Timeline
```
Work Center: Extrusion Line 1
08:00  09:00  10:00  11:00  12:00  13:00  14:00  15:00  16:00  17:00
|------|------|------|------|------|------|------|------|------|
  WO-1    WO-2    WO-3         MAINT   WO-4      WO-5
```

---

## 🎥 RECORDING TIPS

### Do's ✅
- **Speak clearly and confidently** - you know this system
- **Show, don't just tell** - run the code, show outputs
- **Pause briefly** between sections - makes editing easier
- **Point out specific lines** - use cursor/highlighter to guide attention
- **Explain WHY, not just WHAT** - "I chose topological sort because..."
- **Keep it concise** - aim for 8-10 minutes max

### Don'ts ❌
- **Don't read code line-by-line** - explain the concept, show key parts
- **Don't apologize** - "sorry this is messy" (even if you think so)
- **Don't ramble** - script your key points beforehand
- **Don't skip error handling** - showing you handle edge cases is impressive
- **Don't forget to breathe** - pace yourself

---

## 📋 PRE-FLIGHT TEST

Before recording, do a dry run:

1. [ ] Open all files you'll reference
2. [ ] Run all test commands to verify they work
3. [ ] Check terminal font size (readable in recording)
4. [ ] Test screen recording quality
5. [ ] Practice once without recording (time yourself)
6. [ ] Have water nearby (8-10 min of talking = dry mouth)

---

## ⏱️ TIME ALLOCATION GUIDE

| Section | Target Time | Priority |
|---------|-------------|----------|
| Introduction | 1-2 min | HIGH |
| Architecture | 2-3 min | HIGH |
| Demo (3 scenarios) | 3-4 min | CRITICAL |
| Trade-offs | 1-2 min | HIGH |
| Closing | 30 sec | MEDIUM |
| **Total** | **8-10 min** | |

If you're running over 10 minutes, cut:
- Detailed code walkthroughs (just show signatures)
- Fourth demo scenario (3 demos is enough)
- Verbose explanations (be concise)

---

## 🚀 WHAT OLIVER IS LOOKING FOR

Based on his email, Oliver evaluates candidates on:

### 1. Clear Explanation of Choices (MOST IMPORTANT)
> "Candidates who score highest explain their choices clearly"
- ✅ Use "I chose X BECAUSE Y" pattern throughout
- ✅ Not just WHAT you did, but WHY you did it
- ✅ Show you understand the reasoning, not just the implementation

### 2. Understanding of Correct > Optimal
> "A correct scheduler is worth far more than an optimized one that violates constraints"
- ✅ Say "constraint satisfaction is the core requirement" explicitly
- ✅ Say "correct before intelligent" using his exact words
- ✅ Show you didn't optimize prematurely

### 3. Explicit Trade-offs
> "Be explicit about trade-offs you considered"
- ✅ State what you chose (greedy)
- ✅ State what you didn't choose (backtracking, CP-SAT)
- ✅ Explain WHY greedy is appropriate (simple, correct, fast)

### 4. Topological Sort Understanding
> "Be prepared to explain WHY this approach works"
- ✅ Don't just say "I used topological sort"
- ✅ Explain: Dependencies form a DAG, topo sort gives valid ordering, guarantees prerequisites before dependents

### 5. @upgrade Comments
> "Document what you'd improve given more time using @upgrade comments"
- ✅ Show actual code with @upgrade comments
- ✅ Explain what each upgrade would add
- ✅ Shows you understand future directions

### 6. Validation & Proof
> "Confirm there are no overlaps, no work outside shifts, all dependencies satisfied"
- ✅ Show validation code
- ✅ Point out constraint checks in demo outputs
- ✅ Prove correctness through validation

---

## 💪 CONFIDENCE BOOSTERS

You're hitting all of Oliver's requirements:

✅ **Constraint satisfaction FIRST** - emphasized throughout
✅ **Correct before intelligent** - greedy is the right choice
✅ **Explain WHY** - every decision has reasoning
✅ **Explicit trade-offs** - greedy vs alternatives clearly stated
✅ **@upgrade comments** - future improvements documented
✅ **Topological sort WHY** - DAG concept explained
✅ **Validation proof** - all constraints checked
✅ **Test strategy** - small manual + large stress test
✅ **ERP understanding** - MO, WO, WC explained correctly
✅ **Maintenance is sacred** - emphasized multiple times
✅ **Optimization metrics** - acknowledged but correctness first

**You've built exactly what Oliver is looking for. Just follow this script and you'll demonstrate:**
- Deep understanding of the problem domain
- Thoughtful architectural decisions
- Clear communication of trade-offs
- Correct implementation proven through validation
- Awareness of future improvements

**You've got this! 🚀**

---

## 📋 QUICK REFERENCE: COMMANDS & VISUALS

**Print this section or keep it on another screen during recording!**

### Section 1: Introduction (1-2 min)
```
SCREEN: VS Code - README.md or project overview
COMMANDS: None
TALKING POINTS:
- Constraint satisfaction is core requirement
- Manufacturing Orders → Work Orders → Work Centers
- Maintenance is SACRED
- Correct before intelligent
```

### Section 2: Architecture (2-3 min)
```
FILES TO OPEN IN ORDER:
1. src/core/scheduler.ts (15 sec)
   → Show reflowSchedule function signature

2. src/core/dependency-resolver.ts (20 sec)
   → Show topologicalSort function
   → Explain WHY: Dependencies form DAG, topo sort gives valid ordering

3. src/core/time-calculator.ts (20 sec)
   → Show calculateEndTime function
   → Explain shift boundary pausing logic

4. src/core/constraint-validator.ts (25 sec)
   → Show validateSchedule function
   → List all 5 constraints checked

COMMANDS: None (just show code)
```

### Section 3: Live Demos (3-4 min)
```
SCREEN: Terminal

COMMANDS TO RUN:
1. Demo 1 - Diamond Dependencies (45 sec)
   npm run test:scenario:5
   HIGHLIGHT: Assembly waits for BOTH Part A and Part B

2. Demo 2 - Shift Spanning (45 sec)
   npm run test:scenario:7
   HIGHLIGHT: Work pauses at 5 PM, resumes 8 AM

3. Demo 3 - Resource Contention (60 sec)
   npm run test:scenario:8
   HIGHLIGHT: No overlaps, maintenance is SACRED

4. Demo 4 - Impossible (30 sec) [OPTIONAL]
   npm run test:scenario:6
   HIGHLIGHT: Clear error messages explaining WHY

5. Demo 5 - Large Scale (45 sec)
   time npm run test:scenario:4
   HIGHLIGHT: 1,000 work orders completed in X seconds

TOTAL DEMO TIME: ~4 minutes
```

### Section 4: Trade-offs (1-2 min)
```
SCREEN: VS Code

FILES TO OPEN:
1. src/core/scheduler.ts
   → @upgrade comment about greedy vs optimal
   → Explain WHY greedy: simple, correct, fast

2. types/index.ts or scheduler.ts
   → @upgrade comment about priority handling
   → Explain what you'd add: priority queue

3. src/core/metrics.ts (if exists)
   → @upgrade comment about optimization metrics
   → Explain priorities: Total delay (HIGH), Orders affected (MEDIUM)

COMMANDS: None (just show @upgrade comments)
DURATION: 20 seconds per topic = 60 seconds total
```

### Section 5: Closing (30 sec)
```
SCREEN: Terminal or VS Code overview
COMMANDS: None
TALKING POINTS:
- Constraint satisfaction achieved ✓
- Correct before intelligent ✓
- Trade-offs documented ✓
- Ready for production ✓
```

---

## ⌨️ ALL COMMANDS CHEAT SHEET

**Copy-paste ready commands for each demo:**

```bash
# Demo 1: Diamond Dependencies
npm run test:scenario:5
# OR: node dist/index.js --scenario=5

# Demo 2: Shift Boundary Spanning
npm run test:scenario:7
# OR: node dist/index.js --scenario=7

# Demo 3: Resource Contention
npm run test:scenario:8
# OR: node dist/index.js --scenario=8

# Demo 4: Impossible Schedule (optional)
npm run test:scenario:6
# OR: node dist/index.js --scenario=6

# Demo 5: Large-Scale Performance
time npm run test:scenario:4
# OR: time node dist/index.js --scenario=4

# Show all scenarios
ls -la data/

# Clear terminal before demos
clear
```

---

## 📁 FILES TO OPEN CHEAT SHEET

**Files in order of appearance:**

1. README.md (Section 1)
2. src/core/scheduler.ts (Section 2 & 4)
3. src/core/dependency-resolver.ts (Section 2)
4. src/core/time-calculator.ts (Section 2)
5. src/core/constraint-validator.ts (Section 2)
6. data/scenario-5-diamond-dependencies.json (Section 3 - brief)
7. data/scenario-7-shift-boundary-spanning.json (Section 3 - brief)
8. data/scenario-8-resource-contention.json (Section 3 - brief)
9. src/core/scheduler.ts again (Section 4 - @upgrade comments)
10. types/index.ts or relevant file (Section 4 - @upgrade comments)

**TIP:** Open all these files in VS Code tabs BEFORE recording, then just click between them!

---

## 🎯 FINAL PRE-RECORDING CHECKLIST

**Run through this 5 minutes before recording:**

- [ ] All test commands work (run them once to verify)
- [ ] Terminal font size 16-18pt (readable)
- [ ] VS Code zoom level comfortable (Cmd/Ctrl + =)
- [ ] All files opened in tabs
- [ ] Terminal history cleared (`clear`)
- [ ] No sensitive info visible
- [ ] Microphone tested
- [ ] Screen recording tested
- [ ] Water nearby
- [ ] Timer ready (aim for 8-10 minutes)
- [ ] This script open on second screen or printed

---

## 🚀 YOU'RE READY TO RECORD!

**Remember:**
- Speak clearly and confidently
- Explain WHY not just WHAT
- Point at screen with cursor to guide attention
- Pause briefly between sections
- If you mess up, just pause 3 seconds and restart that sentence (easy to edit)

**Oliver's looking for:**
✅ Clear explanation of choices
✅ Understanding of correct > optimal
✅ Explicit trade-offs
✅ WHY topological sort works
✅ @upgrade comments

**You've got all of this covered. You've got this! 🎬**
