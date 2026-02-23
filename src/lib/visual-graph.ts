/**
 * Visual graph model layer for CKP workflow editor.
 * Builds VisualNode[] and VisualEdge[] from CKP JSON without mutating the source.
 */

import type { CkpJson, CkpNode } from "./ckp-types"

export type VisualNodeKind =
  | "workflow_node"
  | "step"
  | "operation"
  | "verification"
  | "error_handler"

export interface VisualNode {
  id: string
  visualType: VisualNodeKind
  parentId?: string
  /** Index among siblings (for ordering). */
  index?: number
  data: Record<string, unknown>
}

export interface VisualEdge {
  id: string
  source: string
  target: string
  type?: string
  /** True if edge is internal to a workflow node (step→step, etc.). */
  isInternal?: boolean
}

function getSteps(ckpNode: Record<string, unknown>): unknown[] {
  const seq = ckpNode.sequence as Record<string, unknown> | undefined
  const auto = ckpNode.automation as Record<string, unknown> | undefined
  const steps = (seq?.steps ?? auto?.steps) as unknown[] | undefined
  return Array.isArray(steps) ? steps : []
}

function getOperations(ckpNode: Record<string, unknown>): unknown[] {
  const proc = ckpNode.processing as Record<string, unknown> | undefined
  const ops = proc?.operations as unknown[] | undefined
  return Array.isArray(ops) ? ops : []
}

function getChecks(ckpNode: Record<string, unknown>): unknown[] {
  const ver = ckpNode.verification as Record<string, unknown> | undefined
  const checks = ver?.checks as unknown[] | undefined
  return Array.isArray(checks) ? checks : []
}

function getErrorHandlers(ckpNode: Record<string, unknown>): unknown[] {
  const seq = ckpNode.sequence as Record<string, unknown> | undefined
  const handlers = seq?.error_handlers as unknown[] | undefined
  return Array.isArray(handlers) ? handlers : []
}

/**
 * Builds the visual graph from CKP JSON. Does not mutate ckpJson.
 */
export function buildVisualGraph(ckpJson: CkpJson): {
  nodes: VisualNode[]
  edges: VisualEdge[]
} {
  const nodes: VisualNode[] = []
  const edges: VisualEdge[] = []
  const graph = ckpJson.workflow_graph
  if (!graph?.nodes?.length) return { nodes, edges }

  const seenEdges = new Set<string>()
  function addEdge(source: string, target: string, isInternal = false) {
    const key = `${source}\x00${target}`
    if (seenEdges.has(key)) return
    seenEdges.add(key)
    edges.push({
      id: `e-${source}-${target}`,
      source,
      target,
      type: "smoothstep",
      isInternal,
    })
  }

  for (const ckpNode of graph.nodes as CkpNode[]) {
    const parentId = ckpNode.id
    const nodeRecord = ckpNode as unknown as Record<string, unknown>
    const nodeType = (ckpNode.type as string) ?? ""

    // 1. Parent workflow node for every CKP node
    nodes.push({
      id: parentId,
      visualType: "workflow_node",
      data: {
        label: nodeType,
        ckpNode: { ...ckpNode },
        ckpNodeType: nodeType,
      },
    })

    // 2. Sequence or automation: expand steps into child visual nodes
    const steps = getSteps(nodeRecord)
    if (steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i] as Record<string, unknown>
        const stepId = `${parentId}-step-${i}`
        nodes.push({
          id: stepId,
          visualType: "step",
          parentId,
          index: i,
          data: {
            stepIndex: i,
            step,
            parentId,
            ckpNode: nodeRecord,
          },
        })
        if (i > 0) {
          addEdge(`${parentId}-step-${i - 1}`, stepId, true)
        }
      }
    }

    // 3. Processing: expand operations
    const operations = getOperations(nodeRecord)
    if (operations.length > 0) {
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i] as Record<string, unknown>
        const opId = `${parentId}-op-${i}`
        nodes.push({
          id: opId,
          visualType: "operation",
          parentId,
          index: i,
          data: {
            opIndex: i,
            operation: op,
            parentId,
            ckpNode: nodeRecord,
          },
        })
        if (i > 0) {
          addEdge(`${parentId}-op-${i - 1}`, opId, true)
        }
      }
    }

    // 4. Verification: expand checks
    const checks = getChecks(nodeRecord)
    if (checks.length > 0) {
      for (let i = 0; i < checks.length; i++) {
        const check = checks[i] as Record<string, unknown>
        const checkId = `${parentId}-check-${i}`
        nodes.push({
          id: checkId,
          visualType: "verification",
          parentId,
          index: i,
          data: {
            checkIndex: i,
            check,
            parentId,
            ckpNode: nodeRecord,
          },
        })
        if (i > 0) {
          addEdge(`${parentId}-check-${i - 1}`, checkId, true)
        }
      }
    }

    // 5. Error handlers (from sequence)
    const errorHandlers = getErrorHandlers(nodeRecord)
    for (let i = 0; i < errorHandlers.length; i++) {
      const handler = errorHandlers[i] as Record<string, unknown>
      const handlerId = `${parentId}-err-${i}`
      nodes.push({
        id: handlerId,
        visualType: "error_handler",
        parentId,
        index: i,
        data: {
          handlerIndex: i,
          handler,
          parentId,
          ckpNode: nodeRecord,
        },
      })
      addEdge(parentId, handlerId, true)
    }
  }

  // 6. Workflow-level edges from CKP (next_node, logic, parallel, loop)
  const nodeById = new Map<string, CkpNode>()
  for (const n of graph.nodes as CkpNode[]) {
    if (n?.id) nodeById.set(n.id, n)
  }

  for (const ckpNode of graph.nodes as CkpNode[]) {
    const id = ckpNode.id
    const next = ckpNode.next_node
    if (next) addEdge(id, next, false)

    const rules = ckpNode.logic?.rules
    if (Array.isArray(rules)) {
      for (const rule of rules) {
        const target = rule.next_node ?? rule.target_node
        if (target) addEdge(id, target, false)
      }
    }

    const branches = ckpNode.parallel?.branches
    if (Array.isArray(branches)) {
      for (const branch of branches) {
        const entry =
          branch.start_node ??
          branch.first_node ??
          (branch.nodes as { id?: string }[])?.[0]?.id
        if (entry) addEdge(id, entry, false)
      }
    }

    const bodyNode = ckpNode.loop?.body_node
    if (bodyNode) addEdge(id, bodyNode, false)
  }

  return { nodes, edges }
}

/**
 * Builds visual nodes and edges for a single parent (its children + internal edges).
 * Used by rebuildParentSubtree. Does not mutate ckpJson.
 */
export function buildVisualSubtree(
  ckpJson: CkpJson,
  parentId: string,
): { childNodes: VisualNode[]; internalEdges: VisualEdge[] } {
  const graph = ckpJson.workflow_graph
  const childNodes: VisualNode[] = []
  const internalEdges: VisualEdge[] = []
  if (!graph?.nodes) return { childNodes, internalEdges }

  const ckpNode = (graph.nodes as CkpNode[]).find((n) => n.id === parentId)
  if (!ckpNode) return { childNodes, internalEdges }

  const nodeRecord = ckpNode as unknown as Record<string, unknown>
  const seen = new Set<string>()

  function addInternalEdge(source: string, target: string) {
    const key = `${source}\x00${target}`
    if (seen.has(key)) return
    seen.add(key)
    internalEdges.push({ id: `e-${source}-${target}`, source, target, type: "smoothstep", isInternal: true })
  }

  const steps = getSteps(nodeRecord)
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i] as Record<string, unknown>
    const stepId = `${parentId}-step-${i}`
    childNodes.push({
      id: stepId,
      visualType: "step",
      parentId,
      index: i,
      data: { stepIndex: i, step, parentId, ckpNode: nodeRecord },
    })
    if (i > 0) addInternalEdge(`${parentId}-step-${i - 1}`, stepId)
  }

  const operations = getOperations(nodeRecord)
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i] as Record<string, unknown>
    const opId = `${parentId}-op-${i}`
    childNodes.push({
      id: opId,
      visualType: "operation",
      parentId,
      index: i,
      data: { opIndex: i, operation: op, parentId, ckpNode: nodeRecord },
    })
    if (i > 0) addInternalEdge(`${parentId}-op-${i - 1}`, opId)
  }

  const checks = getChecks(nodeRecord)
  for (let i = 0; i < checks.length; i++) {
    const check = checks[i] as Record<string, unknown>
    const checkId = `${parentId}-check-${i}`
    childNodes.push({
      id: checkId,
      visualType: "verification",
      parentId,
      index: i,
      data: { checkIndex: i, check, parentId, ckpNode: nodeRecord },
    })
    if (i > 0) addInternalEdge(`${parentId}-check-${i - 1}`, checkId)
  }

  const errorHandlers = getErrorHandlers(nodeRecord)
  for (let i = 0; i < errorHandlers.length; i++) {
    const handler = errorHandlers[i] as Record<string, unknown>
    const handlerId = `${parentId}-err-${i}`
    childNodes.push({
      id: handlerId,
      visualType: "error_handler",
      parentId,
      index: i,
      data: { handlerIndex: i, handler, parentId, ckpNode: nodeRecord },
    })
    addInternalEdge(parentId, handlerId)
  }

  return { childNodes, internalEdges }
}
