import { create } from "zustand"
import type { Node, Edge } from "reactflow"
import { reactFlowToCkp } from "@/lib/ckp-parser"
import type { CkpJson, CkpNode } from "@/lib/ckp-types"
import { buildVisualGraph } from "@/lib/visual-graph"
import { visualToReactFlow } from "@/lib/visual-to-reactflow"
import { rebuildParentSubtree } from "@/lib/rebuild-subtree"

/** Clears references to nodeId from a node's ckpNode. Returns a new node. */
function removeNodeRefsFromCkpNode(node: Node, nodeId: string): Node {
  const ckp = (node.data?.ckpNode as Record<string, unknown>) ?? {}
  const clear = (id: unknown) => (id === nodeId ? undefined : id)

  const next: Record<string, unknown> = { ...ckp }

  if (next.next_node !== undefined) next.next_node = clear(next.next_node)

  const logic = next.logic as Record<string, unknown> | undefined
  if (logic && typeof logic === "object") {
    const rules = logic.rules as Array<Record<string, unknown>> | undefined
    if (Array.isArray(rules)) {
      next.logic = {
        ...logic,
        rules: rules.map((r) => ({
          ...r,
          next_node: r.next_node === nodeId ? undefined : r.next_node,
          target_node: r.target_node === nodeId ? undefined : r.target_node,
        })),
      }
    }
    if (logic.default_next_node === nodeId) {
      next.logic = { ...logic, default_next_node: undefined }
    }
  }

  const parallel = next.parallel as Record<string, unknown> | undefined
  if (parallel && typeof parallel === "object") {
    const branches = parallel.branches as Array<Record<string, unknown>> | undefined
    if (Array.isArray(branches)) {
      next.parallel = {
        ...parallel,
        branches: branches.map((b) => ({
          ...b,
          start_node: b.start_node === nodeId ? undefined : b.start_node,
          first_node: b.first_node === nodeId ? undefined : b.first_node,
          nodes: Array.isArray(b.nodes)
            ? (b.nodes as Array<{ id?: string }>).filter((n) => n?.id !== nodeId)
            : b.nodes,
        })),
      }
    }
    if (parallel.next_node === nodeId) {
      next.parallel = { ...parallel, next_node: undefined }
    }
  }

  const loop = next.loop as Record<string, unknown> | undefined
  if (loop && typeof loop === "object") {
    if (loop.body_node === nodeId || loop.next_node === nodeId) {
      next.loop = {
        ...loop,
        ...(loop.body_node === nodeId && { body_node: undefined }),
        ...(loop.next_node === nodeId && { next_node: undefined }),
      }
    }
  }

  const human_approval = next.human_approval as Record<string, unknown> | undefined
  if (human_approval && typeof human_approval === "object") {
    next.human_approval = {
      ...human_approval,
      on_approve: clear(human_approval.on_approve),
      on_reject: clear(human_approval.on_reject),
      on_timeout: clear(human_approval.on_timeout),
    }
  }

  const verification = next.verification as Record<string, unknown> | undefined
  if (verification && typeof verification === "object" && verification.next_node === nodeId) {
    next.verification = { ...verification, next_node: undefined }
  }

  const processing = next.processing as Record<string, unknown> | undefined
  if (processing && typeof processing === "object" && processing.next_node === nodeId) {
    next.processing = { ...processing, next_node: undefined }
  }

  const subflow = next.subflow as Record<string, unknown> | undefined
  if (subflow && typeof subflow === "object" && subflow.next_node === nodeId) {
    next.subflow = { ...subflow, next_node: undefined }
  }

  const transform = next.transform as Record<string, unknown> | undefined
  if (transform && typeof transform === "object" && transform.next_node === nodeId) {
    next.transform = { ...transform, next_node: undefined }
  }

  return {
    ...node,
    data: { ...node.data, ckpNode: next },
  }
}

/** Apply a new edge from source to target into the source node's ckpNode. Returns updated node. */
function applyEdgeToCkpNode(node: Node, sourceId: string, targetId: string): Node | null {
  if (node.id !== sourceId) return null
  const ckp = (node.data?.ckpNode as Record<string, unknown>) ?? {}
  const type = (ckp.type as string) ?? ""

  const next: Record<string, unknown> = { ...ckp }

  switch (type) {
    case "logic": {
      const logic = (next.logic as Record<string, unknown>) ?? {}
      const rules = (logic.rules as Array<Record<string, unknown>>) ?? []
      next.logic = { ...logic, rules: [...rules, { next_node: targetId }] }
      break
    }
    case "parallel": {
      const parallel = (next.parallel as Record<string, unknown>) ?? {}
      const branches = (parallel.branches as Array<Record<string, unknown>>) ?? []
      next.parallel = { ...parallel, branches: [...branches, { start_node: targetId }] }
      break
    }
    case "loop":
      next.loop = { ...(next.loop as Record<string, unknown>), body_node: targetId }
      break
    default:
      next.next_node = targetId
  }

  return {
    ...node,
    data: { ...node.data, ckpNode: next },
  }
}

const initialNodes: Node[] = [
  { id: "1", type: "input", position: { x: 100, y: 50 }, data: { label: "Start" } },
  { id: "2", position: { x: 100, y: 150 }, data: { label: "Step 1" } },
  { id: "3", position: { x: 100, y: 250 }, data: { label: "Step 2" } },
]
const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", type: "smoothstep" },
  { id: "e2-3", source: "2", target: "3", type: "smoothstep" },
]

interface WorkflowState {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  rawCKP: CkpJson | null
  /** Parent node id -> expanded (true) or collapsed (false). Undefined = expanded. */
  expandedNodes: Record<string, boolean>

  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void
  setSelectedNodeId: (id: string | null) => void
  setExpanded: (nodeId: string, expanded: boolean) => void

  loadWorkflow: (ckp: CkpJson) => void
  /** Update rawCKP in place (immutable update), then optionally rebuild a parent subtree. */
  updateRawCKP: (
    updater: (ckp: CkpJson) => CkpJson,
    options?: { rebuildParentId?: string },
  ) => void
  /** Rebuild only visual children and internal edges for this parent. Preserves positions. */
  rebuildParentSubtree: (parentId: string) => void
  /** Add a step to sequence/automation node in rawCKP; then rebuild that parent subtree. */
  addStep: (parentId: string, defaultStep?: Record<string, unknown>) => void
  /** Remove step at index from parent's sequence/automation; then rebuild subtree. */
  deleteStep: (parentId: string, stepIndex: number) => void
  /** Reorder steps: move from fromIndex to toIndex; then rebuild subtree. */
  reorderSteps: (parentId: string, fromIndex: number, toIndex: number) => void
  /** Update a single step in rawCKP (sequence or automation); then rebuild parent subtree. */
  updateStepInRawCKP: (
    parentId: string,
    stepIndex: number,
    stepPatch: Record<string, unknown>,
  ) => void
  /** Update a workflow node in rawCKP; then rebuild its subtree. */
  updateWorkflowNodeInRawCKP: (nodeId: string, patch: Record<string, unknown>) => void

  updateNode: (nodeId: string, data: Partial<Record<string, unknown>>) => void
  deleteNode: (nodeId: string) => void
  addNode: (node: Node) => void
  updateEdge: (edgeId: string, updates: Partial<Pick<Edge, "source" | "target">>) => void
  connectNodes: (source: string, target: string) => void
  exportCKP: () => CkpJson
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNodeId: null,
  rawCKP: null,
  expandedNodes: {},

  setNodes: (nodesOrUpdater) =>
    set((state) => ({
      nodes: typeof nodesOrUpdater === "function" ? nodesOrUpdater(state.nodes) : nodesOrUpdater,
    })),

  setEdges: (edgesOrUpdater) =>
    set((state) => ({
      edges: typeof edgesOrUpdater === "function" ? edgesOrUpdater(state.edges) : edgesOrUpdater,
    })),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setExpanded: (nodeId, expanded) => {
    set((s) => ({
      expandedNodes: { ...s.expandedNodes, [nodeId]: expanded },
    }))
    const state = get()
    if (!state.rawCKP) return
    const visual = buildVisualGraph(state.rawCKP)
    const graph = state.rawCKP.workflow_graph
    const startNodeId = (graph?.start_node as string) ?? ""
    const workflowPositions: Record<string, { x: number; y: number }> = {}
    for (const n of state.nodes) {
      if (!n.parentNode && (n.type === "workflowNode" || n.type === "input")) {
        workflowPositions[n.id] = n.position
      }
    }
    const { nodes, edges } = visualToReactFlow({
      visualNodes: visual.nodes,
      visualEdges: visual.edges,
      expandedNodes: { ...state.expandedNodes, [nodeId]: expanded },
      startNodeId,
      workflowPositions,
    })
    set({ nodes, edges })
  },

  loadWorkflow: (ckp) => {
    const visual = buildVisualGraph(ckp)
    const graph = ckp.workflow_graph
    const startNodeId = (graph?.start_node as string) ?? ""
    const { nodes, edges } = visualToReactFlow({
      visualNodes: visual.nodes,
      visualEdges: visual.edges,
      expandedNodes: {},
      startNodeId,
    })
    set({
      nodes,
      edges,
      rawCKP: ckp,
      expandedNodes: {},
      selectedNodeId: null,
    })
  },

  updateRawCKP: (updater, options) => {
    const state = get()
    const ckp = state.rawCKP
    if (!ckp) return
    const next = updater(ckp)
    set({ rawCKP: next })
    if (options?.rebuildParentId) {
      get().rebuildParentSubtree(options.rebuildParentId)
    }
  },

  rebuildParentSubtree: (parentId) => {
    const state = get()
    if (!state.rawCKP) return
    const { nodes, edges } = rebuildParentSubtree(
      state.nodes,
      state.edges,
      state.rawCKP,
      parentId,
      state.expandedNodes,
    )
    set({ nodes, edges })
  },

  addStep: (parentId, defaultStep) => {
    const state = get()
    const ckp = state.rawCKP
    if (!ckp?.workflow_graph?.nodes) return
    const nodes = ckp.workflow_graph.nodes as CkpNode[]
    const node = nodes.find((n) => n.id === parentId)
    if (!node) return
    const rec = node as unknown as Record<string, unknown>
    const seq = rec.sequence as Record<string, unknown> | undefined
    const auto = rec.automation as Record<string, unknown> | undefined
    const steps = (seq?.steps ?? auto?.steps) as unknown[] | undefined
    if (!Array.isArray(steps)) return
    const stepId = `step_${Date.now().toString(36)}`
    const newStep = defaultStep ?? {
      step_id: stepId,
      action: "wait",
      target: "",
      value: "",
    }
    const nextSteps = [...steps, newStep]
    if (seq) {
      get().updateRawCKP((c) => {
        const r = (x: CkpNode) => (x as Record<string, unknown>)
        const g = { ...c.workflow_graph, nodes: c.workflow_graph.nodes.map((n) => (n.id === parentId ? { ...n, sequence: { ...(r(n).sequence ?? {}), steps: nextSteps } } : n)) } as CkpJson["workflow_graph"]
        return { ...c, workflow_graph: g }
      }, { rebuildParentId: parentId })
    } else if (auto) {
      get().updateRawCKP((c) => {
        const r = (x: CkpNode) => (x as Record<string, unknown>)
        const g = { ...c.workflow_graph, nodes: c.workflow_graph.nodes.map((n) => (n.id === parentId ? { ...n, automation: { ...(r(n).automation ?? {}), steps: nextSteps } } : n)) } as CkpJson["workflow_graph"]
        return { ...c, workflow_graph: g }
      }, { rebuildParentId: parentId })
    }
  },

  deleteStep: (parentId, stepIndex) => {
    const state = get()
    const ckp = state.rawCKP
    if (!ckp?.workflow_graph?.nodes) return
    const nodes = ckp.workflow_graph.nodes as CkpNode[]
    const node = nodes.find((n) => n.id === parentId)
    if (!node) return
    const rec = node as unknown as Record<string, unknown>
    const seq = rec.sequence as Record<string, unknown> | undefined
    const auto = rec.automation as Record<string, unknown> | undefined
    const steps = (seq?.steps ?? auto?.steps) as unknown[] | undefined
    if (!Array.isArray(steps) || stepIndex < 0 || stepIndex >= steps.length) return
    const nextSteps = steps.filter((_, i) => i !== stepIndex)
    if (seq) {
      get().updateRawCKP((c) => {
        const r = (x: CkpNode) => (x as Record<string, unknown>)
        const g = { ...c.workflow_graph, nodes: c.workflow_graph.nodes.map((n) => (n.id === parentId ? { ...n, sequence: { ...(r(n).sequence ?? {}), steps: nextSteps } } : n)) } as CkpJson["workflow_graph"]
        return { ...c, workflow_graph: g }
      }, { rebuildParentId: parentId })
    } else if (auto) {
      get().updateRawCKP((c) => {
        const r = (x: CkpNode) => (x as Record<string, unknown>)
        const g = { ...c.workflow_graph, nodes: c.workflow_graph.nodes.map((n) => (n.id === parentId ? { ...n, automation: { ...(r(n).automation ?? {}), steps: nextSteps } } : n)) } as CkpJson["workflow_graph"]
        return { ...c, workflow_graph: g }
      }, { rebuildParentId: parentId })
    }
  },

  reorderSteps: (parentId, fromIndex, toIndex) => {
    const state = get()
    const ckp = state.rawCKP
    if (!ckp?.workflow_graph?.nodes) return
    const nodes = ckp.workflow_graph.nodes as CkpNode[]
    const node = nodes.find((n) => n.id === parentId)
    if (!node) return
    const rec = node as unknown as Record<string, unknown>
    const seq = rec.sequence as Record<string, unknown> | undefined
    const auto = rec.automation as Record<string, unknown> | undefined
    const steps = (seq?.steps ?? auto?.steps) as unknown[] | undefined
    if (!Array.isArray(steps) || fromIndex === toIndex) return
    const nextSteps = [...steps]
    const [removed] = nextSteps.splice(fromIndex, 1)
    nextSteps.splice(toIndex, 0, removed)
    if (seq) {
      get().updateRawCKP((c) => {
        const r = (x: CkpNode) => (x as Record<string, unknown>)
        const g = { ...c.workflow_graph, nodes: c.workflow_graph.nodes.map((n) => (n.id === parentId ? { ...n, sequence: { ...(r(n).sequence ?? {}), steps: nextSteps } } : n)) } as CkpJson["workflow_graph"]
        return { ...c, workflow_graph: g }
      }, { rebuildParentId: parentId })
    } else if (auto) {
      get().updateRawCKP((c) => {
        const r = (x: CkpNode) => (x as Record<string, unknown>)
        const g = { ...c.workflow_graph, nodes: c.workflow_graph.nodes.map((n) => (n.id === parentId ? { ...n, automation: { ...(r(n).automation ?? {}), steps: nextSteps } } : n)) } as CkpJson["workflow_graph"]
        return { ...c, workflow_graph: g }
      }, { rebuildParentId: parentId })
    }
  },

  updateStepInRawCKP: (parentId, stepIndex, stepPatch) => {
    const state = get()
    const ckp = state.rawCKP
    if (!ckp?.workflow_graph?.nodes) return
    const nodes = ckp.workflow_graph.nodes as CkpNode[]
    const node = nodes.find((n) => n.id === parentId)
    if (!node) return
    const rec = node as unknown as Record<string, unknown>
    const seq = rec.sequence as Record<string, unknown> | undefined
    const auto = rec.automation as Record<string, unknown> | undefined
    const steps = (seq?.steps ?? auto?.steps) as Record<string, unknown>[]
    if (!Array.isArray(steps) || stepIndex < 0 || stepIndex >= steps.length) return
    const nextSteps = steps.map((s, i) => (i === stepIndex ? { ...s, ...stepPatch } : s))
    if (seq) {
      const r = (x: CkpNode) => (x as Record<string, unknown>)
      get().updateRawCKP(
        (c) => ({
          ...c,
          workflow_graph: {
            ...c.workflow_graph,
            nodes: c.workflow_graph.nodes.map((n) =>
              n.id === parentId ? { ...n, sequence: { ...(r(n).sequence ?? {}), steps: nextSteps } } : n,
            ) as CkpNode[],
          },
        }),
        { rebuildParentId: parentId },
      )
    } else if (auto) {
      const r = (x: CkpNode) => (x as Record<string, unknown>)
      get().updateRawCKP(
        (c) => ({
          ...c,
          workflow_graph: {
            ...c.workflow_graph,
            nodes: c.workflow_graph.nodes.map((n) =>
              n.id === parentId ? { ...n, automation: { ...(r(n).automation ?? {}), steps: nextSteps } } : n,
            ) as CkpNode[],
          },
        }),
        { rebuildParentId: parentId },
      )
    }
  },

  updateWorkflowNodeInRawCKP: (nodeId, patch) => {
    get().updateRawCKP(
      (c) => ({
        ...c,
        workflow_graph: {
          ...c.workflow_graph,
          nodes: c.workflow_graph.nodes.map((n) =>
            n.id === nodeId ? { ...n, ...patch } : n,
          ) as CkpNode[],
        },
      }),
      { rebuildParentId: nodeId },
    )
  },

  updateNode: (nodeId, dataPatch) =>
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n
        const ckp = (n.data?.ckpNode as Record<string, unknown>) ?? {}
        return {
          ...n,
          data: {
            ...n.data,
            label: (dataPatch.type ?? dataPatch.label ?? n.data?.label) as string,
            ckpNode: { ...ckp, ...dataPatch },
          },
        }
      }),
    })),

  deleteNode: (nodeId) =>
    set((state) => {
      const nodes = state.nodes
        .filter((n) => n.id !== nodeId)
        .map((n) => removeNodeRefsFromCkpNode(n, nodeId))
      const edges = state.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
      )
      return {
        nodes,
        edges,
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      }
    }),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),

  updateEdge: (edgeId, updates) =>
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id !== edgeId ? e : { ...e, ...updates },
      ),
    })),

  connectNodes: (source, target) =>
    set((state) => {
      const edgeId = `e-${source}-${target}-${Date.now()}`
      const newEdge: Edge = { id: edgeId, source, target, type: "smoothstep" }
      const sourceNode = state.nodes.find((n) => n.id === source)
      const updated = sourceNode
        ? applyEdgeToCkpNode(sourceNode, source, target)
        : null
      const nodes = updated
        ? state.nodes.map((n) => (n.id === source ? updated : n))
        : state.nodes
      const edges = [...state.edges, newEdge]
      return { nodes, edges }
    }),

  exportCKP: () => {
    const { nodes, edges, rawCKP } = get()
    const topLevelNodes = nodes.filter((n) => !n.parentNode)
    const topLevelIds = new Set(topLevelNodes.map((n) => n.id))
    const topLevelEdges = edges.filter(
      (e) => topLevelIds.has(e.source) && topLevelIds.has(e.target),
    )
    return reactFlowToCkp(topLevelNodes, topLevelEdges, rawCKP)
  },
}))
