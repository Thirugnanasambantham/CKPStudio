import type { Node, Edge } from "reactflow"
import { DRILL_DOWN_BACK_NODE_ID } from "@/stores/workflow-store"

const DRILL_DOWN_BACK_POSITION = { x: 20, y: 20 }
const DRILL_DOWN_FOCUS_OFFSET = { x: 80, y: 80 }

/**
 * Builds the node and edge lists for drill-down view: only the focused workflow node,
 * its children, and a "Back to workflow" node. Positions the focused node below the back button.
 */
export function buildDrillDownView(
  nodes: Node[],
  edges: Edge[],
  focusedNodeId: string,
): { nodes: Node[]; edges: Edge[] } {
  const focusSet = new Set<string>([focusedNodeId])
  for (const n of nodes) {
    if (n.parentNode === focusedNodeId) focusSet.add(n.id)
  }

  const focusNode = nodes.find((n) => n.id === focusedNodeId)
  const childNodes = nodes.filter((n) => n.parentNode === focusedNodeId)

  const backNode: Node = {
    id: DRILL_DOWN_BACK_NODE_ID,
    type: "back",
    position: DRILL_DOWN_BACK_POSITION,
    data: { label: "Back to workflow" },
    draggable: false,
    selectable: false,
  }

  const viewNodes: Node[] = [
    backNode,
    ...(focusNode
      ? [
          {
            ...focusNode,
            position: {
              x: DRILL_DOWN_FOCUS_OFFSET.x,
              y: DRILL_DOWN_FOCUS_OFFSET.y,
            },
          } as Node,
        ]
      : []),
    ...childNodes,
  ]

  const viewEdges = edges.filter(
    (e) => focusSet.has(e.source) && focusSet.has(e.target),
  )

  const backEdge: Edge = {
    id: `e-${DRILL_DOWN_BACK_NODE_ID}-${focusedNodeId}`,
    source: DRILL_DOWN_BACK_NODE_ID,
    target: focusedNodeId,
    type: "smoothstep",
    style: { strokeDasharray: "5 5", strokeWidth: 1 },
    animated: false,
  }

  return {
    nodes: viewNodes,
    edges: [...viewEdges, backEdge],
  }
}
