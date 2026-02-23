import { memo } from "react"
import { Handle, type NodeProps, Position } from "reactflow"
import { cn } from "@/lib/utils"

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  sequence: { bg: "bg-blue-500/15", border: "border-blue-500", text: "text-blue-700 dark:text-blue-300" },
  logic: { bg: "bg-purple-500/15", border: "border-purple-500", text: "text-purple-700 dark:text-purple-300" },
  loop: { bg: "bg-orange-500/15", border: "border-orange-500", text: "text-orange-700 dark:text-orange-300" },
  parallel: { bg: "bg-pink-500/15", border: "border-pink-500", text: "text-pink-700 dark:text-pink-300" },
  llm_action: { bg: "bg-green-500/15", border: "border-green-500", text: "text-green-700 dark:text-green-300" },
  terminate: { bg: "bg-red-500/15", border: "border-red-500", text: "text-red-700 dark:text-red-300" },
  start: { bg: "bg-blue-500/15", border: "border-blue-500", text: "text-blue-700 dark:text-blue-300" },
  verification: { bg: "bg-cyan-500/15", border: "border-cyan-500", text: "text-cyan-700 dark:text-cyan-300" },
  processing: { bg: "bg-slate-500/15", border: "border-slate-500", text: "text-slate-700 dark:text-slate-300" },
  human_approval: { bg: "bg-amber-500/15", border: "border-amber-500", text: "text-amber-700 dark:text-amber-300" },
  transform: { bg: "bg-teal-500/15", border: "border-teal-500", text: "text-teal-700 dark:text-teal-300" },
  subflow: { bg: "bg-indigo-500/15", border: "border-indigo-500", text: "text-indigo-700 dark:text-indigo-300" },
  sop: { bg: "bg-slate-500/15", border: "border-slate-500", text: "text-slate-700 dark:text-slate-300" },
  automation: { bg: "bg-violet-500/15", border: "border-violet-500", text: "text-violet-700 dark:text-violet-300" },
}

function getColors(type: string) {
  const key = (type ?? "").toLowerCase()
  return TYPE_COLORS[key] ?? {
    bg: "bg-muted/50",
    border: "border-border",
    text: "text-foreground",
  }
}

export interface CkpNodeData {
  label?: string
  ckpNode?: {
    id?: string
    type?: string
    agent?: string
    [key: string]: unknown
  }
}

function CkpNodeComponent({ id, data, selected }: NodeProps<CkpNodeData>) {
  const ckp = data?.ckpNode
  const nodeId = ckp?.id ?? id
  const nodeType = ckp?.type ?? data?.label ?? "node"
  const agent = ckp?.agent

  const colors = getColors(nodeType)

  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !border-2 !bg-background" />
      <div
        className={cn(
          "min-w-[140px] max-w-[220px] rounded-lg border-2 px-3 py-2 shadow-sm transition-shadow cursor-pointer",
          colors.bg,
          colors.border,
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md",
        )}
      >
        <div className="space-y-1">
          <div className="font-mono text-xs text-muted-foreground truncate" title={nodeId}>
            {nodeId}
          </div>
          <div className={cn("font-semibold text-sm", colors.text)}>
            {nodeType}
          </div>
          {agent != null && String(agent).length > 0 && (
            <div className="text-xs text-muted-foreground truncate">
              {agent}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !border-2 !bg-background" />
    </>
  )
}

export const CkpNode = memo(CkpNodeComponent)
