import { memo } from "react"
import { Handle, type NodeProps, Position } from "reactflow"
import { cn } from "@/lib/utils"
import { useWorkflowStore } from "@/stores/workflow-store"

export interface VerificationNodeData {
  checkIndex?: number
  check?: Record<string, unknown>
  parentId?: string
  ckpNode?: Record<string, unknown>
}

function VerificationNodeComponent({ id, data, selected }: NodeProps<VerificationNodeData>) {
  const setSelectedNodeId = useWorkflowStore((s) => s.setSelectedNodeId)
  const check = data?.check as Record<string, unknown> | undefined
  const condition = (check?.condition as string) ?? "check"
  const id_ = (check?.id as string) ?? id

  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !border-2 !bg-background" />
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-cyan-500/50 bg-cyan-500/10 pl-2 pr-2 py-1 min-w-0 max-w-full cursor-pointer shadow-sm border-l-4 border-l-cyan-500",
          selected && "ring-1 ring-primary",
        )}
        onClick={() => setSelectedNodeId(id)}
      >
        <span className="font-mono text-xs text-muted-foreground truncate">{id_}</span>
        <span className="text-xs font-medium text-foreground truncate">{condition}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !border-2 !bg-background" />
    </>
  )
}

export const VerificationNode = memo(VerificationNodeComponent)
