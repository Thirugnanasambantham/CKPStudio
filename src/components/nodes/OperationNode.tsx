import { memo } from "react"
import { Handle, type NodeProps, Position } from "reactflow"
import { cn } from "@/lib/utils"
import { useWorkflowStore } from "@/stores/workflow-store"

export interface OperationNodeData {
  opIndex?: number
  operation?: Record<string, unknown>
  parentId?: string
  ckpNode?: Record<string, unknown>
}

function OperationNodeComponent({ id, data, selected }: NodeProps<OperationNodeData>) {
  const setSelectedNodeId = useWorkflowStore((s) => s.setSelectedNodeId)
  const op = data?.operation as Record<string, unknown> | undefined
  const action = (op?.action as string) ?? "op"

  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !border-2 !bg-background" />
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-border bg-slate-500/10 pl-2 pr-2 py-1 min-w-0 max-w-full cursor-pointer shadow-sm border-l-4 border-l-slate-500",
          selected && "ring-1 ring-primary",
        )}
        onClick={() => setSelectedNodeId(id)}
      >
        <span className="text-xs font-medium text-foreground truncate">{action}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !border-2 !bg-background" />
    </>
  )
}

export const OperationNode = memo(OperationNodeComponent)
