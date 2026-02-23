import { memo } from "react"
import { type NodeProps } from "reactflow"
import { ArrowLeft } from "lucide-react"
import { useWorkflowStore } from "@/stores/workflow-store"
import { cn } from "@/lib/utils"

export interface BackNodeData {
  label?: string
}

function BackNodeComponent({ data }: NodeProps<BackNodeData>) {
  const setDrillDownNodeId = useWorkflowStore((s) => s.setDrillDownNodeId)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setDrillDownNodeId(null)}
      onKeyDown={(e) => e.key === "Enter" && setDrillDownNodeId(null)}
      className={cn(
        "flex items-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/40",
        "bg-muted/50 px-4 py-2.5 cursor-pointer",
        "hover:border-primary/60 hover:bg-muted transition-colors",
        "text-sm font-medium text-muted-foreground hover:text-foreground",
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      {data?.label ?? "Back to workflow"}
    </div>
  )
}

export const BackNode = memo(BackNodeComponent)
