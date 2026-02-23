# CKP Studio — Developer Guide

This guide covers **setup** and **understanding the codebase** for the CKP Studio Visual Workflow Editor.

---

## 1. Setup

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** (comes with Node) or **pnpm** / **yarn**

### Install and run

```bash
# Clone the repo (if not already)
git clone <repo-url>
cd CKPStudio

# Install dependencies
npm install

# Start the dev server (with hot reload)
npm run dev
```

Then open the URL shown in the terminal (e.g. `http://localhost:5173`).

### Scripts

| Script       | Command          | Description                          |
| ------------ | ----------------- | ------------------------------------ |
| **Dev**      | `npm run dev`     | Start Vite dev server with HMR       |
| **Build**    | `npm run build`   | TypeScript check + production build  |
| **Preview**  | `npm run preview` | Serve the production build locally   |

### Try it with sample data

1. Run `npm run dev`.
2. In the app, use **Upload** (or the upload control in the toolbar).
3. Choose `public/sample_workflow.json` to load a full CKP workflow with nested steps.

---

## 2. Tech stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Runtime     | React 19, TypeScript 5.9            |
| Build       | Vite 7                              |
| Styling     | Tailwind CSS v4, shadcn/ui (Radix)  |
| State       | Zustand                             |
| Canvas      | React Flow 11                       |
| Icons       | Lucide React                        |
| Toasts      | Sonner                              |

---

## 3. Project structure

```
CKPStudio/
├── public/
│   └── sample_workflow.json    # Sample CKP workflow for testing
├── src/
│   ├── App.tsx                 # Root: theme sync + Layout + WorkflowView
│   ├── main.tsx                # Entry: React root mount
│   ├── hooks/
│   │   └── use-theme.ts        # Theme sync (e.g. dark/light)
│   ├── lib/                    # Core logic (no UI)
│   │   ├── ckp-types.ts        # CKP JSON types (CkpJson, CkpNode, etc.)
│   │   ├── ckp-parser.ts       # validateCkpJson, reactFlowToCkp (export)
│   │   ├── visual-graph.ts    # buildVisualGraph, buildVisualSubtree
│   │   ├── visual-to-reactflow.ts  # Visual → React Flow nodes/edges
│   │   ├── rebuild-subtree.ts # rebuildParentSubtree (partial rebuild)
│   │   └── utils.ts           # cn() etc.
│   ├── stores/
│   │   └── workflow-store.ts  # Single source of truth: nodes, edges, rawCKP
│   ├── components/
│   │   ├── Layout.tsx          # App shell
│   │   ├── WorkflowView.tsx    # Canvas + palette + editor wiring
│   │   ├── WorkflowCanvas.tsx # React Flow, drop, drag, connect
│   │   ├── NodePalette.tsx    # Draggable node types + contextual “Add Step”
│   │   ├── NodeEditorPanel.tsx # Selected node / step form + JSON
│   │   ├── StepActionSelector.tsx # Dynamic form per action (web/API/DB…)
│   │   ├── TopToolbar.tsx     # Upload, Export
│   │   ├── nodes/             # React Flow node components
│   │   │   ├── WorkflowNode.tsx   # Parent container (header, expand, + step)
│   │   │   ├── StepNode.tsx       # One step (pill + stripe by category)
│   │   │   ├── OperationNode.tsx
│   │   │   ├── VerificationNode.tsx
│   │   │   ├── ErrorHandlerNode.tsx
│   │   │   └── CkpNode.tsx        # Fallback for flat/default nodes
│   │   ├── ui/                # shadcn-style primitives
│   │   └── ...
│   └── ...
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts (or Tailwind via Vite)
```

---

## 4. Key concepts

### CKP (Workflow JSON)

- **CKP** is the JSON format that describes the workflow.
- Root has `workflow_graph` with `start_node` and `nodes[]`.
- Each node has `id`, `type` (e.g. `sequence`, `logic`, `automation`, `verification`, `processing`), and type-specific payloads:
  - **sequence / automation:** `sequence.steps[]` or `automation.steps[]` (step_id, action, target, value, …).
  - **processing:** `processing.operations[]`.
  - **verification:** `verification.checks[]`.
  - **logic:** `logic.rules[]` (branching).
  - **parallel:** `parallel.branches[]`.
  - **loop:** `loop.body_node`, etc.

Types are defined in `src/lib/ckp-types.ts`. The editor does **not** run workflows; it only edits this JSON.

### rawCKP (single source of truth)

- **rawCKP** is the in-memory CKP document (Zustand store).
- All edits that affect the workflow **must** update `rawCKP` first; the UI is then derived from it.
- Flow: **user action → update rawCKP → rebuild affected visual parts → update React Flow state.**

### Visual graph (intermediate model)

- The **visual graph** is an intermediate representation used to drive the canvas.
- **Visual nodes:** each workflow node is a `workflow_node`; its steps/operations/checks/error_handlers are `step` / `operation` / `verification` / `error_handler` nodes with a `parentId`.
- **Visual edges:** workflow-level edges (next_node, logic, parallel, loop) and **internal** edges (step→step, etc.).
- Built by `buildVisualGraph(ckpJson)` in `src/lib/visual-graph.ts`. **Never mutates** the CKP object.

### React Flow layer

- **Nodes:** workflow nodes are containers (`workflowNode` or `input` for start); their children are step/operation/verification/error_handler nodes with `parentNode` and `extent: 'parent'`.
- **Edges:** internal edges are thin and dashed; workflow-level edges are solid and thicker (see `src/lib/visual-to-reactflow.ts`).

### Partial rebuild

- When only one workflow node’s steps change, we **do not** rebuild the whole graph.
- **rebuildParentSubtree(parentId)** (in `src/lib/rebuild-subtree.ts` and exposed from the store):
  - Removes that parent’s current child nodes and internal edges.
  - Rebuilds them from `rawCKP` and updates the parent’s size.
  - Keeps all other nodes and workflow-level edges (and their positions) unchanged.

---

## 5. Data flow (where to look)

### Loading a workflow

1. User selects a JSON file → **TopToolbar** reads it and calls `validateCkpJson()`.
2. If valid, **workflow-store** `loadWorkflow(ckp)` is called:
   - Sets `rawCKP = ckp`.
   - Calls `buildVisualGraph(rawCKP)` → visual nodes/edges.
   - Calls `visualToReactFlow(...)` with `expandedNodes` (and optional preserved positions).
   - Sets store `nodes` and `edges` (React Flow state).

### Editing a step (e.g. change action or target)

1. User selects a **step node** → **NodeEditorPanel** shows **StepActionSelector**.
2. User changes a field → **updateStepInRawCKP(parentId, stepIndex, patch)** in the store:
   - Updates `rawCKP.workflow_graph.nodes[parentId].sequence.steps[stepIndex]` (or `automation.steps`).
   - Calls **rebuildParentSubtree(parentId)** so only that container’s children and internal edges are recreated.

### Adding a step

1. User clicks “+” on a workflow node (or “Add Step” in the palette when a workflow node is selected).
2. Store **addStep(parentId)** appends a new step to `sequence.steps` or `automation.steps` in `rawCKP`, then **rebuildParentSubtree(parentId)**.

### Deleting / reordering steps

- **Delete:** user clicks delete on a step node → **deleteStep(parentId, stepIndex)** updates `rawCKP` and **rebuildParentSubtree(parentId)**.
- **Reorder:** user drags a step node → **onNodeDragStop** in **WorkflowCanvas** computes the new index from `position.y` and calls **reorderSteps(parentId, fromIndex, toIndex)** → update `rawCKP` and **rebuildParentSubtree(parentId)**.

### Expand / collapse

- **setExpanded(nodeId, expanded)** updates `expandedNodes`, then rebuilds the **full** visual graph (with current workflow positions preserved) so children are shown or hidden. Only expand state changes; `rawCKP` is unchanged.

### Export

- **exportCKP()** uses only **top-level** nodes (no `parentNode`) and workflow-level edges, and **reactFlowToCkp(...)** to produce the final CKP (with `rawCKP` as base when present). So the exported file reflects the current diagram and step data.

---

## 6. Where to find what

| Goal                         | Where to look                                  |
| ---------------------------- | ---------------------------------------------- |
| CKP JSON shape              | `src/lib/ckp-types.ts`                         |
| Validate / parse CKP        | `src/lib/ckp-parser.ts`                        |
| Build visual nodes/edges    | `src/lib/visual-graph.ts`                      |
| Visual → React Flow         | `src/lib/visual-to-reactflow.ts`               |
| Rebuild one parent          | `src/lib/rebuild-subtree.ts`                   |
| Global state (rawCKP, etc.) | `src/stores/workflow-store.ts`                 |
| Canvas and interactions     | `src/components/WorkflowCanvas.tsx`            |
| Node types (UI)             | `src/components/nodes/*.tsx`                   |
| Step form by action         | `src/components/StepActionSelector.tsx`        |
| Upload / Export             | `src/components/TopToolbar.tsx`                |
| Selection + editor panel    | `src/components/NodeEditorPanel.tsx`           |

---

## 7. Extending the app

### Add a new workflow node type (flat, no children)

1. **Types:** extend or use existing in `ckp-types.ts` if the node has a new payload shape.
2. **Visual graph:** in `visual-graph.ts`, the new type will already create a single `workflow_node`; no extra children unless you add logic (e.g. a new `steps`-like array).
3. **Palette:** add the type to `NODE_TYPES` in `NodePalette.tsx` and (if you want a distinct style) to `TYPE_COLORS` in `WorkflowNode.tsx` and/or `CkpNode.tsx`.
4. **Drop:** in `WorkflowCanvas.tsx` `onDrop`, you can set a default payload for the new type (e.g. `ckpNode.newField = {}`).

### Add a new step action (e.g. “send_email”)

1. **StepActionSelector:** in `StepActionSelector.tsx`, add the action to the right category (or a new one), then add the fields you need (e.g. `to`, `subject`, `body`) and wire them to `onChange` (which calls `updateStepInRawCKP`).
2. **StepNode stripe:** in `StepNode.tsx`, extend the category/stripe logic (e.g. `EMAIL_ACTIONS`) and `stripeColor()` so the new action gets a distinct color if desired.

### Add expandable children for another node type

1. **visual-graph.ts:** in `buildVisualGraph`, when `node.type === 'your_type'`, push child visual nodes (e.g. `your_type-item-0`, `your_type-item-1`) and push internal edges; set their `parentId` and `visualType`.
2. **visual-to-reactflow.ts:** map the new `visualType` to a React Flow node type (or reuse an existing one).
3. **rebuild-subtree.ts:** in `buildVisualSubtree`, add a branch for your type that returns the same shape of child nodes and internal edges.
4. **workflow-store:** add helpers (e.g. `addItem`, `deleteItem`, `reorderItems`) that update `rawCKP` and call **rebuildParentSubtree(parentId)**.
5. **Node components:** add a new node type in `components/nodes/` and register it in `WorkflowCanvas` `nodeTypes`.

### Styling (Tailwind / theme)

- Global and theme: Tailwind v4 + CSS variables (see root layout or global CSS).
- Component-level: use `cn()` from `@/lib/utils` and Tailwind classes; for node colors, follow the pattern in `WorkflowNode.tsx` and `StepNode.tsx`.

---

## 8. Rules to keep in mind

1. **Do not mutate CKP passed into the app.** Clone or create new objects when updating `rawCKP`.
2. **Always update rawCKP first**, then call **rebuildParentSubtree** (or full rebuild for expand/collapse). Do not edit React Flow `nodes`/`edges` directly for anything that should persist.
3. **Preserve workflow node positions** when rebuilding: they are read from current `nodes` and passed as `workflowPositions` into `visualToReactFlow` / rebuild logic.
4. This app is **visual only**; there is no execution engine. Any “run” or “test” feature would be a separate layer that consumes the exported CKP.

---

## 9. Quick reference: store API

| Method                         | Purpose |
| ------------------------------ | ------- |
| `loadWorkflow(ckp)`            | Set rawCKP and build full visual graph (nodes + edges). |
| `setExpanded(nodeId, expanded)` | Toggle expand/collapse; rebuilds graph with positions preserved. |
| `updateRawCKP(updater, { rebuildParentId? })` | Apply an immutable update to rawCKP; optionally rebuild one parent. |
| `rebuildParentSubtree(parentId)` | Rebuild only that parent’s children and internal edges from rawCKP. |
| `addStep(parentId, defaultStep?)` | Append step to sequence/automation; rebuild parent. |
| `deleteStep(parentId, stepIndex)` | Remove step; rebuild parent. |
| `reorderSteps(parentId, from, to)` | Reorder steps; rebuild parent. |
| `updateStepInRawCKP(parentId, stepIndex, patch)` | Patch one step; rebuild parent. |
| `updateWorkflowNodeInRawCKP(nodeId, patch)` | Patch workflow node; rebuild its subtree. |
| `exportCKP()`                  | Return CKP JSON from top-level nodes + edges (and rawCKP). |

For more detail on types and function signatures, use your editor’s “Go to definition” on these names in `src/stores/workflow-store.ts` and the `src/lib` modules.
