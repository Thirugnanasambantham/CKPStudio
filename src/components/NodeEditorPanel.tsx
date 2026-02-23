import { useCallback } from "react"
import { Trash2 } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { JsonEditor } from "@/components/JsonEditor"
import { StepActionSelector } from "@/components/StepActionSelector"
import { useWorkflowStore } from "@/stores/workflow-store"
import { cn } from "@/lib/utils"

const NODE_TYPES = [
  "sequence",
  "logic",
  "loop",
  "parallel",
  "automation",
  "processing",
  "verification",
  "llm_action",
  "terminate",
  "sop",
  "subflow",
  "human_approval",
  "transform",
  "start",
  "end",
]

const AGENTS = [
  "MasterAgent",
  "WEB",
  "DESKTOP",
  "LLMAgent",
  "EMAIL",
  "API",
  "DATABASE",
]

export function NodeEditorPanel() {
  const nodes = useWorkflowStore((s) => s.nodes)
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId)
  const rawCKP = useWorkflowStore((s) => s.rawCKP)
  const updateNode = useWorkflowStore((s) => s.updateNode)
  const deleteNode = useWorkflowStore((s) => s.deleteNode)
  const updateStepInRawCKP = useWorkflowStore((s) => s.updateStepInRawCKP)
  const updateWorkflowNodeInRawCKP = useWorkflowStore((s) => s.updateWorkflowNodeInRawCKP)

  const node = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null
  const ckp = (node?.data?.ckpNode as Record<string, unknown>) ?? {}
  const isStepNode =
    rawCKP != null &&
    node?.data?.parentId != null &&
    typeof (node?.data?.stepIndex as number) === "number"
  const parentId = node?.data?.parentId as string | undefined
  const stepIndex = node?.data?.stepIndex as number | undefined
  const step = node?.data?.step as Record<string, unknown> | undefined

  const patch = useCallback(
    (partial: Record<string, unknown>) => {
      if (!selectedNodeId) return
      if (rawCKP && !node?.parentNode) {
        updateWorkflowNodeInRawCKP(selectedNodeId, partial)
      } else {
        updateNode(selectedNodeId, partial)
      }
    },
    [selectedNodeId, rawCKP, node?.parentNode, updateNode, updateWorkflowNodeInRawCKP],
  )

  const patchStep = useCallback(
    (stepPatch: Record<string, unknown>) => {
      if (parentId != null && stepIndex != null) updateStepInRawCKP(parentId, stepIndex, stepPatch)
    },
    [parentId, stepIndex, updateStepInRawCKP],
  )

  if (!node || !selectedNodeId) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Select a node to edit
      </div>
    )
  }

  if (isStepNode && step != null && parentId != null && stepIndex != null) {
    return (
      <div className="flex h-full flex-col overflow-auto rounded-lg border border-border bg-background p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Step: {String(step.step_id ?? node?.id ?? "")}
        </h3>
        <p className="mb-2 text-xs text-muted-foreground">Use the delete icon on the step node to remove it.</p>
        <StepActionSelector step={step as Record<string, unknown>} onChange={patchStep} />
      </div>
    )
  }

  const description = (ckp.description as string) ?? ""
  const type = (ckp.type as string) ?? ""
  const agent = (ckp.agent as string) ?? ""
  const next_node = (ckp.next_node as string) ?? ""
  const inputs = ckp.inputs
  const outputs = ckp.outputs
  const sequence = ckp.sequence
  const logic = ckp.logic
  const loop = ckp.loop
  const automation = ckp.automation

  return (
    <div className="flex h-full flex-col overflow-auto rounded-lg border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Node: {node.id}</h3>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => selectedNodeId && deleteNode(selectedNodeId)}
          aria-label="Delete node"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Input
            id="desc"
            value={description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Node description"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            value={type}
            onChange={(e) => patch({ type: e.target.value })}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <option value="">—</option>
            {NODE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent">Agent</Label>
          <select
            id="agent"
            value={agent}
            onChange={(e) => patch({ agent: e.target.value })}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <option value="">—</option>
            {AGENTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="next_node">Next node</Label>
          <Input
            id="next_node"
            value={next_node}
            onChange={(e) => patch({ next_node: e.target.value })}
            placeholder="node_id"
          />
        </div>

        <JsonEditor
          label="Inputs"
          value={inputs}
          onChange={(v) => patch({ inputs: v })}
        />

        <JsonEditor
          label="Outputs"
          value={outputs}
          onChange={(v) => patch({ outputs: v })}
        />

        <Accordion type="multiple" className="w-full">
          <AccordionItem value="sequence">
            <AccordionTrigger>Sequence</AccordionTrigger>
            <AccordionContent>
              <JsonEditor
                value={sequence}
                onChange={(v) => patch({ sequence: v })}
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="logic">
            <AccordionTrigger>Logic</AccordionTrigger>
            <AccordionContent>
              <JsonEditor
                value={logic}
                onChange={(v) => patch({ logic: v })}
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="loop">
            <AccordionTrigger>Loop</AccordionTrigger>
            <AccordionContent>
              <JsonEditor
                value={loop}
                onChange={(v) => patch({ loop: v })}
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="automation">
            <AccordionTrigger>Automation steps (MCP web/desktop)</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2 text-xs text-muted-foreground">
                Steps for type, click, wait_for_element, extract_table_data, take_screenshot, etc.
              </p>
              <JsonEditor
                value={automation}
                onChange={(v) => patch({ automation: v })}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}
