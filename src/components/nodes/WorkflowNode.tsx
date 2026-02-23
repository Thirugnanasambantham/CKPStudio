import { memo } from "react"
import { Handle, type NodeProps, Position } from "reactflow"
import { ChevronDown, ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkflowStore } from "@/stores/workflow-store"

export interface WorkflowNodeData {
  label?: string
  ckpNode?: Record<string, unknown>
  ckpNodeType?: string
  isStart?: boolean
}

const TYPE_COLORS: Record<string, string> = {
  sequence: "border-blue-500 bg-blue-500/10",
  automation: "border-violet-500 bg-violet-500/10",
  verification: "border-cyan-500 bg-cyan-500/10",
  processing: "border-slate-500 bg-slate-500/10",
  logic: "border-purple-500 bg-purple-500/10",
  loop: "border-orange-500 bg-orange-500/10",
  parallel: "border-pink-500 bg-pink-500/10",
  terminate: "border-red-500 bg-red-500/10",
  default: "border-border bg-muted/30",
}

function WorkflowNodeComponent({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const expandedNodes = useWorkflowStore((s) => s.expandedNodes)
  const setExpanded = useWorkflowStore((s) => s.setExpanded)
  const setSelectedNodeId = useWorkflowStore((s) => s.setSelectedNodeId)
  const addStep = useWorkflowStore((s) => s.addStep)
  const rawCKP = useWorkflowStore((s) => s.rawCKP)

  const nodeType = (data?.ckpNodeType ?? data?.label ?? "default") as string
  const isStart = data?.isStart === true
  const expanded = expandedNodes[id] !== false
  const hasSteps =
    nodeType === "sequence" || nodeType === "automation"
  const canAddStep = Boolean(rawCKP && hasSteps)

  const toggleExpand = () => {
    setExpanded(id, !expanded)
  }

  const onAddStep = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (canAddStep) addStep(id)
  }

  const borderCls = TYPE_COLORS[nodeType] ?? TYPE_COLORS.default

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !border-2 !bg-background"
      />
      <div
        className={cn(
          "rounded-2xl border-2 overflow-hidden shadow-sm flex flex-col min-h-[48px]",
          borderCls,
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
        style={{ width: "100%", height: "100%" }}
      >
        <div
          className="flex items-center gap-1 px-2 py-1.5 border-b border-border/50 bg-muted/40 cursor-pointer"
          onClick={() => setSelectedNodeId(id)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleExpand()
            }}
            className="p-0.5 rounded hover:bg-muted"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <span className="font-mono text-xs text-muted-foreground truncate flex-1" title={id}>
            {id}
          </span>
          <span className="text-xs font-medium text-foreground shrink-0">
            {isStart ? "Start" : nodeType}
          </span>
          {canAddStep && (
            <button
              type="button"
              onClick={onAddStep}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Add step"
              aria-label="Add step"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex-1 relative min-h-0" />
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !border-2 !bg-background"
      />
    </>
  )
}

export const WorkflowNode = memo(WorkflowNodeComponent)
