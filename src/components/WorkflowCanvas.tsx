import { useRef, useCallback } from "react"
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "reactflow"
import "reactflow/dist/style.css"
import { CkpNode } from "@/components/nodes/CkpNode"
import { WorkflowNode } from "@/components/nodes/WorkflowNode"
import { StepNode } from "@/components/nodes/StepNode"
import { OperationNode } from "@/components/nodes/OperationNode"
import { VerificationNode } from "@/components/nodes/VerificationNode"
import { ErrorHandlerNode } from "@/components/nodes/ErrorHandlerNode"
import { FitViewHelper } from "@/components/FitViewHelper"
import { ViewportSync, type FlowTransform } from "@/components/ViewportSync"
import { NODE_PALETTE_DRAG_TYPE } from "@/components/NodePalette"
import { useWorkflowStore } from "@/stores/workflow-store"

const PARENT_HEADER_HEIGHT = 48
const CHILD_PADDING = 12
const CHILD_STEP_HEIGHT = 40

const nodeTypes = {
  default: CkpNode,
  input: WorkflowNode,
  workflowNode: WorkflowNode,
  stepNode: StepNode,
  operationNode: OperationNode,
  verificationNode: VerificationNode,
  errorHandlerNode: ErrorHandlerNode,
}

function nextNodeId(type: string): string {
  return `node_${type}_${Date.now().toString(36)}`
}

interface WorkflowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  onSelectionChange?: (selectedNodeId: string | null) => void
}

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectionChange,
}: WorkflowCanvasProps) {
  const addNode = useWorkflowStore((s) => s.addNode)
  const reorderSteps = useWorkflowStore((s) => s.reorderSteps)
  const rawCKP = useWorkflowStore((s) => s.rawCKP)
  const transformRef = useRef<FlowTransform | null>(null)

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent | React.TouchEvent, draggedNode: Node) => {
      const parentId = draggedNode.parentNode ?? (draggedNode.data as { parentId?: string })?.parentId
      const stepIndex = (draggedNode.data as { stepIndex?: number })?.stepIndex
      if (rawCKP == null || parentId == null || typeof stepIndex !== "number") return
      const steps = (() => {
        const graph = rawCKP.workflow_graph
        const n = graph?.nodes?.find((nn: { id?: string }) => nn.id === parentId) as Record<string, unknown> | undefined
        const seq = n?.sequence as { steps?: unknown[] } | undefined
        const auto = n?.automation as { steps?: unknown[] } | undefined
        return seq?.steps ?? auto?.steps ?? []
      })()
      if (steps.length <= 1) return
      const y = draggedNode.position?.y ?? 0
      const newIndex = Math.round((y - PARENT_HEADER_HEIGHT - CHILD_PADDING) / CHILD_STEP_HEIGHT)
      const toIndex = Math.max(0, Math.min(newIndex, steps.length - 1))
      if (toIndex !== stepIndex) reorderSteps(parentId, stepIndex, toIndex)
    },
    [rawCKP, reorderSteps],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData(NODE_PALETTE_DRAG_TYPE)
      if (!type) return
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const t = transformRef.current ?? ([0, 0, 1] as FlowTransform)
      const [tx, ty, zoom] = t
      const position = {
        x: (e.clientX - rect.left - tx) / zoom,
        y: (e.clientY - rect.top - ty) / zoom,
      }
      const id = nextNodeId(type)
      const ckpNode: Record<string, unknown> = { id, type }
      if (type === "automation") ckpNode.automation = { steps: [] }
      const newNode: Node = {
        id,
        type: "default",
        position,
        data: {
          label: type,
          ckpNode,
        },
      }
      addNode(newNode)
    },
    [addNode],
  )

  return (
    <div className="w-full flex-1 flex flex-col rounded-lg border border-border bg-background overflow-hidden min-h-0">
      <div
        className="relative rounded-lg"
        style={{ width: "100%", height: "60vh", minHeight: 400 }}
      >
        <ReactFlow
          className="w-full h-full"
          key={`flow-${nodes.length}-${nodes[0]?.id ?? "e"}`}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onNodeDragStop={onNodeDragStop}
          onSelectionChange={({ nodes: selectedNodes }) => {
            const id = selectedNodes.length === 1 ? selectedNodes[0]?.id ?? null : null
            onSelectionChange?.(id)
          }}
          fitView
          fitViewOptions={{ padding: 0.2, duration: 0 }}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          nodesDraggable
          nodesConnectable
          elementsSelectable
          defaultEdgeOptions={{ type: "smoothstep" }}
          proOptions={{ hideAttribution: true }}
        >
          <ViewportSync transformRef={transformRef} />
          <Background variant={BackgroundVariant.Lines} gap={16} size={1} />
          <Controls />
          <FitViewHelper nodeCount={nodes.length} />
        </ReactFlow>
      </div>
    </div>
  )
}
