/**
 * CKP workflow JSON types for parser input.
 */

export interface CkpLogicRule {
  /** Target node id for this rule branch */
  next_node?: string
  target_node?: string
  [key: string]: unknown
}

export interface CkpLogic {
  rules?: CkpLogicRule[]
  [key: string]: unknown
}

export interface CkpBranch {
  /** Entry node id for this branch */
  start_node?: string
  first_node?: string
  nodes?: { id: string }[]
  [key: string]: unknown
}

export interface CkpParallel {
  branches?: CkpBranch[]
  [key: string]: unknown
}

export interface CkpLoop {
  body_node?: string
  [key: string]: unknown
}

/** Single step for web/desktop MCP automation (type, click, wait_for_element, etc.) */
export interface CkpAutomationStep {
  step_id: string
  action: string
  target?: string
  value?: string
  output_variable?: string
  wait_after_ms?: number
  timeout_ms?: number
  wait_ms?: number
  [key: string]: unknown
}

export interface CkpAutomation {
  steps?: CkpAutomationStep[]
  [key: string]: unknown
}

export interface CkpNode {
  id: string
  type: string
  next_node?: string
  logic?: CkpLogic
  parallel?: CkpParallel
  loop?: CkpLoop
  /** Steps for automation node type (web/desktop MCP: type, click, wait_for_element, etc.) */
  automation?: CkpAutomation
  [key: string]: unknown
}

export interface CkpWorkflowGraph {
  start_node: string
  nodes: CkpNode[]
  [key: string]: unknown
}

export interface CkpJson {
  workflow_graph: CkpWorkflowGraph
  [key: string]: unknown
}
