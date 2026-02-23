/**
 * Converts visual graph to ReactFlow nodes and edges.
 * Handles parent/child layout, extent, and edge styling.
 */

import type { Node, Edge } from "reactflow"
import type { VisualNode, VisualEdge } from "./visual-graph"

const WORKFLOW_SPACING_X = 320
const WORKFLOW_SPACING_Y = 180
const CHILD_STEP_HEIGHT = 40
const CHILD_PADDING = 12
const PARENT_MIN_WIDTH = 200
const PARENT_HEADER_HEIGHT = 48

export interface ToReactFlowOptions {
  visualNodes: VisualNode[]
  visualEdges: VisualEdge[]
  expandedNodes: Record<string, boolean>
  startNodeId: string
  /** Optional: existing positions for workflow nodes (id -> {x,y}) to preserve layout. */
  workflowPositions?: Record<string, { x: number; y: number }>
}

/**
 * Converts visual graph to React Flow nodes and edges.
 * Parent nodes use extent "parent"; children use parentNode + extent "parent".
 * Internal edges are dashed and thin; workflow edges are solid and thicker.
 */
export function visualToReactFlow(options: ToReactFlowOptions): {
  nodes: Node[]
  edges: Edge[]
} {
  const {
    visualNodes,
    visualEdges,
    expandedNodes,
    startNodeId,
    workflowPositions = {},
  } = options

  const workflowNodes = visualNodes.filter((n) => n.visualType === "workflow_node")
  const childNodes = visualNodes.filter((n) => n.parentId != null)
  const nodesByParent = new Map<string, VisualNode[]>()
  for (const n of childNodes) {
    const pid = n.parentId!
    if (!nodesByParent.has(pid)) nodesByParent.set(pid, [])
    nodesByParent.get(pid)!.push(n)
  }
  for (const [, arr] of nodesByParent) {
    arr.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  }

  const rfNodes: Node[] = []
  const rfEdges: Edge[] = []

  // Workflow node positions (grid or preserved)
  const workflowPos = new Map<string, { x: number; y: number }>()
  workflowNodes.forEach((w, index) => {
    if (workflowPositions[w.id]) {
      workflowPos.set(w.id, workflowPositions[w.id])
    } else {
      workflowPos.set(w.id, {
        x: (index % 4) * WORKFLOW_SPACING_X,
        y: Math.floor(index / 4) * WORKFLOW_SPACING_Y,
      })
    }
  })

  // Parent dimensions: width from children or min; height = header + children height when expanded
  function getParentSize(parentId: string): { width: number; height: number } {
    const children = nodesByParent.get(parentId) ?? []
    const expanded = expandedNodes[parentId] !== false
    if (!expanded || children.length === 0) {
      return { width: PARENT_MIN_WIDTH, height: PARENT_HEADER_HEIGHT }
    }
    const childHeight = children.length * CHILD_STEP_HEIGHT + CHILD_PADDING * 2
    const width = Math.max(PARENT_MIN_WIDTH, 220)
    return { width, height: PARENT_HEADER_HEIGHT + childHeight }
  }

  for (const v of workflowNodes) {
    const pos = workflowPos.get(v.id) ?? { x: 0, y: 0 }
    const size = getParentSize(v.id)
    const isStart = v.id === startNodeId
    rfNodes.push({
      id: v.id,
      type: isStart ? "input" : "workflowNode",
      position: pos,
      data: {
        ...v.data,
        label: v.data.label as string,
        ckpNode: v.data.ckpNode,
        ckpNodeType: v.data.ckpNodeType,
        isStart,
      },
      style: {
        width: size.width,
        height: size.height,
        zIndex: 0,
      },
    } as Node)
  }

  for (const v of childNodes) {
    const parentId = v.parentId!
    if (expandedNodes[parentId] === false) continue

    const children = nodesByParent.get(parentId) ?? []
    const sorted = [...children].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    const idx = sorted.findIndex((c) => c.id === v.id)
    const y = PARENT_HEADER_HEIGHT + CHILD_PADDING + idx * CHILD_STEP_HEIGHT
    const x = CHILD_PADDING

    rfNodes.push({
      id: v.id,
      type: v.visualType === "step" ? "stepNode" : v.visualType === "operation" ? "operationNode" : v.visualType === "verification" ? "verificationNode" : "errorHandlerNode",
      position: { x, y },
      parentNode: parentId,
      extent: "parent" as const,
      data: v.data,
      draggable: true,
    } as Node)
  }

  for (const e of visualEdges) {
    const isInternal = e.isInternal === true
    rfEdges.push({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      style: isInternal
        ? { strokeWidth: 1, strokeDasharray: "4 2" }
        : { strokeWidth: 2 },
      animated: false,
      data: { isInternal },
    } as Edge)
  }

  return { nodes: rfNodes, edges: rfEdges }
}
