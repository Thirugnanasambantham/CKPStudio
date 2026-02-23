import { memo } from "react"
import { Handle, type NodeProps, Position } from "reactflow"
import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkflowStore } from "@/stores/workflow-store"

const WEB_ACTIONS = new Set([
  "click", "type", "get_text", "wait_for_element", "extract_table_data",
  "take_screenshot", "wait", "navigate", "scroll",
])
const DESKTOP_ACTIONS = new Set(["window", "send_keys", "click_ui", "get_ui"])
const API_ACTIONS = new Set(["request", "get", "post", "put", "patch", "delete"])
const DB_ACTIONS = new Set(["query", "execute", "connection_string"])

function stripeColor(action: string): string {
  const a = (action ?? "").toLowerCase()
  if (WEB_ACTIONS.has(a)) return "bg-blue-500"
  if (DESKTOP_ACTIONS.has(a)) return "bg-orange-500"
  if (API_ACTIONS.has(a)) return "bg-green-500"
  if (DB_ACTIONS.has(a)) return "bg-purple-500"
  return "bg-gray-500"
}

export interface StepNodeData {
  stepIndex?: number
  step?: Record<string, unknown>
  parentId?: string
  ckpNode?: Record<string, unknown>
}

function StepNodeComponent({ id, data, selected }: NodeProps<StepNodeData>) {
  const setSelectedNodeId = useWorkflowStore((s) => s.setSelectedNodeId)
  const deleteStep = useWorkflowStore((s) => s.deleteStep)
  const parentId = data?.parentId as string | undefined
  const stepIndex = data?.stepIndex as number | undefined
  const step = data?.step as Record<string, unknown> | undefined
  const action = (step?.action as string) ?? "wait"
  const stepId = (step?.step_id as string) ?? id

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (parentId != null && stepIndex != null) deleteStep(parentId, stepIndex)
  }

  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !border-2 !bg-background" />
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-border bg-background pl-1 pr-2 py-1 min-w-0 max-w-full cursor-pointer shadow-sm",
          selected && "ring-1 ring-primary",
        )}
        onClick={() => setSelectedNodeId(id)}
      >
        <div className={cn("w-1 rounded-full shrink-0 self-stretch", stripeColor(action))} />
        <span className="font-mono text-xs text-muted-foreground truncate" title={stepId}>
          {stepId}
        </span>
        <span className="text-xs font-medium text-foreground truncate shrink-0">{action}</span>
        {selected && parentId != null && stepIndex != null && (
          <button
            type="button"
            onClick={onDelete}
            className="p-0.5 rounded hover:bg-destructive/20 text-destructive shrink-0"
            aria-label="Delete step"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !border-2 !bg-background" />
    </>
  )
}

export const StepNode = memo(StepNodeComponent)
