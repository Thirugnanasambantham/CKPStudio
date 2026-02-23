/**
 * Partial rebuild: recreate visual children and internal edges for one parent from rawCKP.
 * Preserves parent position and workflow-level edges.
 */

import type { Node, Edge } from "reactflow"
import type { VisualNode, VisualEdge } from "./visual-graph"
import type { CkpJson } from "./ckp-types"
import { buildVisualSubtree } from "./visual-graph"

const CHILD_STEP_HEIGHT = 40
const CHILD_PADDING = 12
const PARENT_MIN_WIDTH = 200
const PARENT_HEADER_HEIGHT = 48

function isDescendantOf(nodeId: string, parentId: string): boolean {
  return nodeId === parentId || nodeId.startsWith(`${parentId}-`)
}

function isInternalEdge(edge: Edge, parentId: string): boolean {
  return (
    isDescendantOf(edge.source, parentId) && isDescendantOf(edge.target, parentId)
  )
}

function visualChildToReactFlowNode(
  v: VisualNode,
  parentId: string,
  index: number,
): Node {
  const y = PARENT_HEADER_HEIGHT + CHILD_PADDING + index * CHILD_STEP_HEIGHT
  const type =
    v.visualType === "step"
      ? "stepNode"
      : v.visualType === "operation"
        ? "operationNode"
        : v.visualType === "verification"
          ? "verificationNode"
          : "errorHandlerNode"
  return {
    id: v.id,
    type,
    position: { x: CHILD_PADDING, y },
    parentNode: parentId,
    extent: "parent" as const,
    data: v.data,
    draggable: true,
  } as Node
}

function visualEdgeToReactFlowEdge(e: VisualEdge): Edge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    style: { strokeWidth: 1, strokeDasharray: "4 2" },
    animated: false,
    data: { isInternal: true },
  } as Edge
}

/**
 * Rebuilds only the visual subtree for the given parent from rawCKP.
 * - Removes existing visual children of parent and internal edges
 * - Recreates children and internal edges from rawCKP
 * - Updates parent node size; preserves parent position
 */
export function rebuildParentSubtree(
  currentNodes: Node[],
  currentEdges: Edge[],
  rawCKP: CkpJson,
  parentId: string,
  expandedNodes: Record<string, boolean>,
): { nodes: Node[]; edges: Edge[] } {
  const { childNodes: newChildVisualNodes, internalEdges: newInternalEdges } =
    buildVisualSubtree(rawCKP, parentId)

  const expanded = expandedNodes[parentId] !== false
  const parentNode = currentNodes.find((n) => n.id === parentId)
  const childCount = newChildVisualNodes.length
  const newHeight =
    childCount > 0 && expanded
      ? PARENT_HEADER_HEIGHT + childCount * CHILD_STEP_HEIGHT + CHILD_PADDING * 2
      : PARENT_HEADER_HEIGHT
  const newWidth = Math.max(PARENT_MIN_WIDTH, 220)

  const updatedParent: Node | undefined = parentNode
    ? {
        ...parentNode,
        style: {
          ...(parentNode.style as Record<string, unknown>),
          width: newWidth,
          height: newHeight,
        },
      }
    : undefined

  const nodesWithoutThisParentChildren = currentNodes.filter(
    (n) => n.parentNode !== parentId,
  )
  const edgesWithoutInternal = currentEdges.filter(
    (e) => !isInternalEdge(e, parentId),
  )

  const newChildRfNodes =
    expanded && newChildVisualNodes.length > 0
      ? newChildVisualNodes.map((v, i) =>
          visualChildToReactFlowNode(v, parentId, i),
        )
      : []
  const newInternalRfEdges = newInternalEdges.map(visualEdgeToReactFlowEdge)

  const nodes = [
    ...nodesWithoutThisParentChildren.filter((n) => n.id !== parentId),
    updatedParent ?? parentNode!,
    ...newChildRfNodes,
  ]
  const edges = [...edgesWithoutInternal, ...newInternalRfEdges]

  return { nodes, edges }
}
