import { useRef } from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { validateCkpJson } from "@/lib/ckp-parser"
import { useWorkflowStore } from "@/stores/workflow-store"

export function TopToolbar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result
      if (typeof text !== "string") {
        toast.error("Failed to read file")
        return
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        toast.error("Invalid JSON")
        return
      }
      const result = validateCkpJson(parsed)
      if (!result.valid) {
        toast.error(result.error)
        return
      }
      if (!(result.data.workflow_graph?.nodes?.length)) {
        toast.error("No nodes in workflow")
        return
      }
      loadWorkflow(result.data)
      toast.success(
        `Workflow loaded: ${result.data.workflow_graph.nodes.length} nodes`,
      )
    }
    reader.onerror = () => toast.error("Failed to read file")
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">
        {nodes.length} nodes · {edges.length} edges
      </span>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload CKP JSON"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        Upload JSON
      </Button>
    </div>
  )
}
