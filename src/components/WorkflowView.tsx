import { useCallback, useMemo } from "react"
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "reactflow"
import { Toaster } from "sonner"
import { TopToolbar } from "@/components/TopToolbar"
import { WorkflowCanvas } from "@/components/WorkflowCanvas"
import { NodePalette } from "@/components/NodePalette"
import { NodeEditorPanel } from "@/components/NodeEditorPanel"
import { useWorkflowStore } from "@/stores/workflow-store"
import { buildDrillDownView } from "@/lib/drill-down-view"

export function WorkflowView() {
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const drillDownNodeId = useWorkflowStore((s) => s.drillDownNodeId)
  const setNodes = useWorkflowStore((s) => s.setNodes)
  const setEdges = useWorkflowStore((s) => s.setEdges)
  const setSelectedNodeId = useWorkflowStore((s) => s.setSelectedNodeId)
  const connectNodes = useWorkflowStore((s) => s.connectNodes)

  const { viewNodes, viewEdges } = useMemo(() => {
    if (drillDownNodeId) {
      const { nodes: drillNodes, edges: drillEdges } = buildDrillDownView(nodes, edges, drillDownNodeId)
      return { viewNodes: drillNodes, viewEdges: drillEdges }
    }
    return { viewNodes: nodes, viewEdges: edges }
  }, [drillDownNodeId, nodes, edges])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((prev) => applyNodeChanges(changes, prev)),
    [setNodes],
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((prev) => applyEdgeChanges(changes, prev)),
    [setEdges],
  )

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) connectNodes(params.source, params.target)
    },
    [connectNodes],
  )

  return (
    <>
      <div className="flex flex-1 gap-4 min-h-0">
        <NodePalette />
        <div className="flex flex-1 flex-col gap-2 min-h-0">
          <TopToolbar />
          <div className="flex flex-1 flex-col min-h-0" style={{ minHeight: "60vh" }}>
            <WorkflowCanvas
              nodes={viewNodes}
              edges={viewEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={setSelectedNodeId}
              filterDrillDownBackFromChanges={Boolean(drillDownNodeId)}
            />
          </div>
        </div>
        <aside className="w-80 shrink-0 flex flex-col min-h-0" style={{ minHeight: "60vh" }}>
          <NodeEditorPanel />
        </aside>
      </div>
      <Toaster richColors position="bottom-right" />
    </>
  )
}