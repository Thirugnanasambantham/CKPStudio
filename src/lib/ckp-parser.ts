import type { Node, Edge } from "reactflow"
import type { CkpJson, CkpNode } from "./ckp-types"

/**
 * Validates CKP JSON structure. Returns { valid: true } or { valid: false, error: string }.
 */
export function validateCkpJson(value: unknown): { valid: true; data: CkpJson } | { valid: false; error: string } {
  if (value == null || typeof value !== "object") {
    return { valid: false, error: "Invalid JSON: expected an object" }
  }
  const obj = value as Record<string, unknown>
  const graph = obj.workflow_graph
  if (graph == null || typeof graph !== "object") {
    const looksLikeSchema =
      "$schema_name" in obj ||
      "$schema_version" in obj ||
      ("root" in obj && !("workflow_graph" in obj))
    if (looksLikeSchema) {
      return {
        valid: false,
        error:
          "This file looks like a CKP schema reference, not a workflow. Upload a file that contains workflow_graph with start_node and nodes array.",
      }
    }
    return {
      valid: false,
      error: "Missing or invalid workflow_graph. Expected an object with start_node and nodes array.",
    }
  }
  const g = graph as Record<string, unknown>
  if (!Array.isArray(g.nodes)) {
    return { valid: false, error: "workflow_graph.nodes must be an array" }
  }
  for (let i = 0; i < g.nodes.length; i++) {
    const n = g.nodes[i]
    if (n == null || typeof n !== "object") {
      return { valid: false, error: `workflow_graph.nodes[${i}] must be an object` }
    }
    const node = n as Record<string, unknown>
    if (typeof node.id !== "string") {
      return { valid: false, error: `workflow_graph.nodes[${i}].id must be a string` }
    }
    if (typeof node.type !== "string") {
      return { valid: false, error: `workflow_graph.nodes[${i}].type must be a string` }
    }
  }
  const startNode = g.start_node
  if (typeof startNode !== "string") {
    return { valid: false, error: "workflow_graph.start_node must be a string" }
  }
  return { valid: true, data: value as CkpJson }
}

const SPACING_X = 280
const SPACING_Y = 120

/**
 * Parses a CKP JSON file into ReactFlow nodes and edges.
 *
 * - workflow_graph.start_node is the entry node (rendered as type "input").
 * - Each workflow_graph.nodes item becomes a ReactFlow node (label = node.type, full node in data).
 * - Edges: next_node, logic.rules[].next_node/target_node, parallel.branches, loop.body_node.
 */
export function parseCkpToReactFlow(ckp: CkpJson): { nodes: Node[]; edges: Edge[] } {
  const graph = ckp.workflow_graph
  if (!graph?.nodes?.length) {
    return { nodes: [], edges: [] }
  }

  const nodeById = new Map<string, CkpNode>()
  for (const n of graph.nodes) {
    if (n?.id) nodeById.set(n.id, n)
  }

  const startId = graph.start_node
  const nodes: Node[] = []
  const edgeList: { source: string; target: string }[] = []
  const seenEdges = new Set<string>()

  function addEdge(source: string, target: string) {
    if (!source || !target) return
    const key = `${source}\x00${target}`
    if (seenEdges.has(key)) return
    seenEdges.add(key)
    edgeList.push({ source, target })
  }

  graph.nodes.forEach((ckpNode, index) => {
    const id = ckpNode.id
    const isStart = id === startId
    const position = {
      x: (index % 4) * SPACING_X,
      y: Math.floor(index / 4) * SPACING_Y,
    }

    nodes.push({
      id,
      type: isStart ? "input" : "default",
      position,
      data: {
        label: ckpNode.type ?? id,
        ckpNode, // full node JSON for consumers
      },
    })

    // next_node → single outgoing edge
    const next = ckpNode.next_node
    if (next) addEdge(id, next)

    // logic.rules → one edge per rule (next_node or target_node)
    const rules = ckpNode.logic?.rules
    if (Array.isArray(rules)) {
      for (const rule of rules) {
        const target = rule.next_node ?? rule.target_node
        if (target) addEdge(id, target)
      }
    }

    // parallel.branches → edge to each branch entry
    const branches = ckpNode.parallel?.branches
    if (Array.isArray(branches)) {
      for (const branch of branches) {
        const entry =
          branch.start_node ??
          branch.first_node ??
          branch.nodes?.[0]?.id
        if (entry) addEdge(id, entry)
      }
    }

    // loop.body_node → edge to body
    const bodyNode = ckpNode.loop?.body_node
    if (bodyNode) addEdge(id, bodyNode)
  })

  const edges: Edge[] = edgeList.map((e, i) => ({
    id: `e${i}-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    type: "smoothstep",
  }))

  return { nodes, edges }
}

/**
 * Builds CKP JSON from current React Flow nodes and edges.
 * Preserves root/$schema from baseCkp when provided.
 */
export function reactFlowToCkp(
  nodes: Node[],
  _edges: Edge[],
  baseCkp: CkpJson | null = null,
): CkpJson {
  const ckpNodes: CkpNode[] = nodes.map((n) => {
    const ckp = (n.data?.ckpNode as Record<string, unknown> | undefined) ?? {}
    const { id: _ckpId, ...rest } = ckp as Record<string, unknown>
    return {
      ...rest,
      id: n.id,
      type: (n.data?.label as string) ?? (ckp.type as string) ?? "default",
    } as CkpNode
  })
  const startNode =
    nodes.find((n) => n.type === "input")?.id ?? nodes[0]?.id ?? ""
  const workflow_graph = {
    start_node: startNode,
    nodes: ckpNodes,
  }
  if (baseCkp && typeof baseCkp === "object") {
    return {
      ...baseCkp,
      workflow_graph: { ...(baseCkp.workflow_graph as Record<string, unknown>), ...workflow_graph },
    }
  }
  return { workflow_graph }
}
