import { memo } from "react"
import { Handle, type NodeProps, Position } from "reactflow"
import { cn } from "@/lib/utils"
import { useWorkflowStore } from "@/stores/workflow-store"

export interface ErrorHandlerNodeData {
  handlerIndex?: number
  handler?: Record<string, unknown>
  parentId?: string
  ckpNode?: Record<string, unknown>
}

function ErrorHandlerNodeComponent({ id, data, selected }: NodeProps<ErrorHandlerNodeData>) {
  const setSelectedNodeId = useWorkflowStore((s) => s.setSelectedNodeId)
  const handler = data?.handler as Record<string, unknown> | undefined
  const label = (handler?.on_error as string) ?? (handler?.action as string) ?? "error"

  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !border-2 !bg-background" />
      <div
        className={cn(
          "flex items-center rounded-full border border-red-500/60 bg-red-500/15 px-2 py-1 min-w-0 max-w-full cursor-pointer shadow-sm border-l-4 border-l-red-500 text-red-700 dark:text-red-300",
          selected && "ring-1 ring-primary",
        )}
        onClick={() => setSelectedNodeId(id)}
      >
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !border-2 !bg-background" />
    </>
  )
}

export const ErrorHandlerNode = memo(ErrorHandlerNodeComponent)
