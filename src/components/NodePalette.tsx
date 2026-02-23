import { GripVertical, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkflowStore } from "@/stores/workflow-store"

const NODE_TYPES = [
  "sequence",
  "logic",
  "loop",
  "parallel",
  "automation",
  "llm_action",
  "terminate",
  "human_approval",
  "subflow",
] as const

export const NODE_PALETTE_DRAG_TYPE = "application/ckp-node-type"

function onDragStart(e: React.DragEvent, nodeType: string) {
  e.dataTransfer.setData(NODE_PALETTE_DRAG_TYPE, nodeType)
  e.dataTransfer.effectAllowed = "move"
}

export function NodePalette() {
  const nodes = useWorkflowStore((s) => s.nodes)
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId)
  const addStep = useWorkflowStore((s) => s.addStep)
  const rawCKP = useWorkflowStore((s) => s.rawCKP)

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null
  const isWorkflowNode =
    selectedNode &&
    !selectedNode.parentNode &&
    (selectedNode.type === "workflowNode" || selectedNode.type === "input")
  const nodeType = (selectedNode?.data?.ckpNodeType ?? selectedNode?.data?.label) as string
  const canAddStep = isWorkflowNode && rawCKP && (nodeType === "sequence" || nodeType === "automation")

  return (
    <aside className="flex w-56 shrink-0 flex-col rounded-lg border border-border bg-background">
      <div className="border-b border-border px-3 py-2 text-sm font-medium text-foreground">
        Node palette
      </div>
      {isWorkflowNode && (
        <div className="border-b border-border px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Add to node</div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              disabled={!canAddStep}
              onClick={() => canAddStep && selectedNodeId && addStep(selectedNodeId)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm",
                canAddStep
                  ? "border-border hover:bg-muted/50 text-foreground"
                  : "border-transparent text-muted-foreground cursor-not-allowed opacity-60",
              )}
            >
              <Plus className="h-4 w-4 shrink-0" />
              Add Step
            </button>
            <button
              type="button"
              disabled
              className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm text-muted-foreground cursor-not-allowed opacity-60"
              title="Coming soon"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Add Operation
            </button>
            <button
              type="button"
              disabled
              className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm text-muted-foreground cursor-not-allowed opacity-60"
              title="Coming soon"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Add Verification
            </button>
            <button
              type="button"
              disabled
              className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm text-muted-foreground cursor-not-allowed opacity-60"
              title="Coming soon"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Add Error Handler
            </button>
          </div>
        </div>
      )}
      <ul className="flex flex-col gap-0.5 p-2">
        {NODE_TYPES.map((type) => (
          <li key={type}>
            <div
              draggable
              onDragStart={(e) => onDragStart(e, type)}
              className={cn(
                "flex cursor-grab items-center gap-2 rounded-md border border-transparent px-2 py-2 text-sm text-foreground",
                "hover:border-border hover:bg-muted/50 active:cursor-grabbing",
              )}
            >
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="capitalize">{type.replace(/_/g, " ")}</span>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}
