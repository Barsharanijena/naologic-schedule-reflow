/**
 * Dependency Resolver - Handles dependency graph operations
 * Implements topological sorting and cycle detection for work order dependencies
 */

import { WorkOrder, DependencyNode, ValidationError } from '../types/common-types';

export class DependencyResolver {
  /**
   * Build dependency graph from work orders
   * Creates nodes with parent/child relationships
   */
  buildDependencyGraph(workOrders: WorkOrder[]): Map<string, DependencyNode> {
    const graph = new Map<string, DependencyNode>();

    // Initialize nodes
    workOrders.forEach(wo => {
      graph.set(wo.docId, {
        workOrderId: wo.docId,
        parents: [...wo.data.dependsOnWorkOrderIds],
        children: [],
        depth: 0
      });
    });

    // Build child relationships and validate dependencies exist
    workOrders.forEach(wo => {
      wo.data.dependsOnWorkOrderIds.forEach(parentId => {
        const parentNode = graph.get(parentId);
        if (!parentNode) {
          throw new Error(
            `Work order ${wo.data.workOrderNumber} depends on non-existent work order: ${parentId}`
          );
        }
        parentNode.children.push(wo.docId);
      });
    });

    return graph;
  }

  /**
   * Detect circular dependencies using DFS
   * Returns validation error if cycle found, null otherwise
   */
  detectCycles(graph: Map<string, DependencyNode>): ValidationError | null {
    const WHITE = 0; // Not visited
    const GRAY = 1;  // Visiting (in current path)
    const BLACK = 2; // Visited (completed)

    const colors = new Map<string, number>();
    const cycleNodes: string[] = [];

    // Initialize all nodes as WHITE
    graph.forEach((_, id) => colors.set(id, WHITE));

    // DFS helper
    const dfs = (nodeId: string, path: string[]): boolean => {
      colors.set(nodeId, GRAY);
      path.push(nodeId);

      const node = graph.get(nodeId)!;

      for (const parentId of node.parents) {
        const color = colors.get(parentId);

        if (color === GRAY) {
          // Found a cycle - parent is in current path
          cycleNodes.push(...path, parentId);
          return true;
        }

        if (color === WHITE) {
          if (dfs(parentId, path)) {
            return true;
          }
        }
      }

      path.pop();
      colors.set(nodeId, BLACK);
      return false;
    };

    // Check all nodes (handles disconnected components)
    for (const [nodeId, color] of colors) {
      if (color === WHITE) {
        if (dfs(nodeId, [])) {
          return {
            type: 'CIRCULAR_DEPENDENCY',
            message: 'Circular dependency detected in work order dependencies',
            workOrderIds: [...new Set(cycleNodes)]
          };
        }
      }
    }

    return null;
  }

  /**
   * Topologically sort work orders by dependencies
   * Returns work orders in execution order (parents before children)
   *
   * Uses Kahn's algorithm (BFS approach)
   */
  topologicalSort(workOrders: WorkOrder[]): WorkOrder[] {
    const graph = this.buildDependencyGraph(workOrders);

    // Check for cycles first
    const cycleError = this.detectCycles(graph);
    if (cycleError) {
      throw new Error(cycleError.message);
    }

    // Calculate in-degree (number of parents) for each node
    const inDegree = new Map<string, number>();
    graph.forEach((node, id) => {
      inDegree.set(id, node.parents.length);
    });

    // Start with nodes that have no dependencies
    const queue: string[] = [];
    inDegree.forEach((degree, id) => {
      if (degree === 0) {
        queue.push(id);
      }
    });

    const sorted: string[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      sorted.push(nodeId);

      const node = graph.get(nodeId)!;

      // Process children
      node.children.forEach(childId => {
        const currentDegree = inDegree.get(childId)!;
        inDegree.set(childId, currentDegree - 1);

        if (currentDegree - 1 === 0) {
          queue.push(childId);
        }
      });
    }

    if (sorted.length !== workOrders.length) {
      throw new Error('Topological sort failed - possible circular dependency');
    }

    // Convert sorted IDs back to work orders
    const workOrderMap = new Map(workOrders.map(wo => [wo.docId, wo]));
    return sorted.map(id => workOrderMap.get(id)!);
  }

  /**
   * Calculate dependency depth for each work order
   * Depth = longest path from root (0 = no dependencies)
   */
  calculateDepths(graph: Map<string, DependencyNode>): void {
    const visited = new Set<string>();

    const calculateDepth = (nodeId: string): number => {
      if (visited.has(nodeId)) {
        return graph.get(nodeId)!.depth;
      }

      visited.add(nodeId);
      const node = graph.get(nodeId)!;

      if (node.parents.length === 0) {
        node.depth = 0;
        return 0;
      }

      const parentDepths = node.parents.map(parentId => calculateDepth(parentId));
      node.depth = Math.max(...parentDepths) + 1;
      return node.depth;
    };

    graph.forEach((_, nodeId) => {
      if (!visited.has(nodeId)) {
        calculateDepth(nodeId);
      }
    });
  }

  /**
   * Get all parent work orders (direct dependencies)
   */
  getParents(workOrderId: string, workOrders: WorkOrder[]): WorkOrder[] {
    const workOrder = workOrders.find(wo => wo.docId === workOrderId);
    if (!workOrder) return [];

    return workOrder.data.dependsOnWorkOrderIds
      .map(parentId => workOrders.find(wo => wo.docId === parentId))
      .filter((wo): wo is WorkOrder => wo !== undefined);
  }

  /**
   * Get all child work orders (dependents)
   */
  getChildren(workOrderId: string, workOrders: WorkOrder[]): WorkOrder[] {
    return workOrders.filter(wo =>
      wo.data.dependsOnWorkOrderIds.includes(workOrderId)
    );
  }

  /**
   * Get all descendants (children, grandchildren, etc.)
   * Returns in topological order
   */
  getAllDescendants(workOrderId: string, workOrders: WorkOrder[]): WorkOrder[] {
    const descendants = new Set<string>();
    const queue = [workOrderId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = this.getChildren(currentId, workOrders);

      children.forEach(child => {
        if (!descendants.has(child.docId)) {
          descendants.add(child.docId);
          queue.push(child.docId);
        }
      });
    }

    // Filter and sort descendants
    const descendantOrders = workOrders.filter(wo => descendants.has(wo.docId));
    return this.topologicalSort(descendantOrders);
  }
}
