import { useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const WEB_ACTIONS = ["click", "type", "get_text", "wait_for_element", "extract_table_data", "take_screenshot", "wait", "navigate", "scroll"]
const DESKTOP_ACTIONS = ["window", "send_keys", "click_ui", "get_ui"]
const API_ACTIONS = ["request", "get", "post", "put", "patch", "delete"]
const DB_ACTIONS = ["query", "execute"]
const FILE_ACTIONS = ["read", "write", "list"]

function category(action: string): "web" | "desktop" | "api" | "database" | "file" | "generic" {
  const a = (action ?? "").toLowerCase()
  if (WEB_ACTIONS.includes(a)) return "web"
  if (DESKTOP_ACTIONS.includes(a)) return "desktop"
  if (API_ACTIONS.includes(a)) return "api"
  if (DB_ACTIONS.includes(a)) return "database"
  if (FILE_ACTIONS.includes(a)) return "file"
  return "generic"
}

const ACTION_OPTIONS: Record<string, string[]> = {
  web: WEB_ACTIONS,
  desktop: DESKTOP_ACTIONS,
  api: API_ACTIONS,
  database: DB_ACTIONS,
  file: FILE_ACTIONS,
  generic: ["wait", "log", "set_variable", "click", "type", "get_text", "wait_for_element", "extract_table_data", "take_screenshot"],
}

export interface StepActionSelectorProps {
  step: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
  disabled?: boolean
}

export function StepActionSelector({ step, onChange, disabled }: StepActionSelectorProps) {
  const action = (step.action as string) ?? "wait"
  const cat = category(action)
  const options = ACTION_OPTIONS[cat] ?? ACTION_OPTIONS.generic

  const patch = useCallback(
    (key: string, value: unknown) => {
      onChange({ [key]: value })
    },
    [onChange],
  )

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Action</Label>
        <select
          value={action}
          onChange={(e) => patch("action", e.target.value)}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {cat === "web" && (
        <>
          <div className="space-y-2">
            <Label>Selector / Target</Label>
            <Input
              value={(step.target as string) ?? (step.selector as string) ?? ""}
              onChange={(e) => patch("target", e.target.value)}
              placeholder="#id, .class, [data-testid='x']"
              disabled={disabled}
              className="h-9"
            />
          </div>
          {(action === "type" || action === "navigate") && (
            <div className="space-y-2">
              <Label>Value / URL</Label>
              <Input
                value={(step.value as string) ?? ""}
                onChange={(e) => patch("value", e.target.value)}
                placeholder={action === "navigate" ? "https://..." : "Text or {{variable}}"}
                disabled={disabled}
                className="h-9"
              />
            </div>
          )}
          {(action === "get_text" || action === "extract_table_data") && (
            <div className="space-y-2">
              <Label>Output variable</Label>
              <Input
                value={(step.output_variable as string) ?? ""}
                onChange={(e) => patch("output_variable", e.target.value)}
                placeholder="e.g. status_text"
                disabled={disabled}
                className="h-9"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Wait after (ms)</Label>
              <Input
                type="number"
                value={(step.wait_after_ms as number) ?? (step.wait_ms as number) ?? ""}
                onChange={(e) => patch("wait_after_ms", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0"
                disabled={disabled}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label>Timeout (ms)</Label>
              <Input
                type="number"
                value={(step.timeout_ms as number) ?? ""}
                onChange={(e) => patch("timeout_ms", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="5000"
                disabled={disabled}
                className="h-9"
              />
            </div>
          </div>
        </>
      )}

      {cat === "desktop" && (
        <>
          <div className="space-y-2">
            <Label>Window title</Label>
            <Input
              value={(step.window_title as string) ?? ""}
              onChange={(e) => patch("window_title", e.target.value)}
              placeholder="Window title or partial match"
              disabled={disabled}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label>Target</Label>
            <Input
              value={(step.target as string) ?? ""}
              onChange={(e) => patch("target", e.target.value)}
              placeholder="Control id or selector"
              disabled={disabled}
              className="h-9"
            />
          </div>
        </>
      )}

      {cat === "api" && (
        <>
          <div className="space-y-2">
            <Label>Method</Label>
            <select
              value={(step.method as string) ?? "GET"}
              onChange={(e) => patch("method", e.target.value)}
              disabled={disabled}
              className={cn(
                "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
              )}
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              value={(step.url as string) ?? ""}
              onChange={(e) => patch("url", e.target.value)}
              placeholder="https://api.example.com/..."
              disabled={disabled}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label>Headers (JSON)</Label>
            <Input
              value={typeof step.headers === "object" ? JSON.stringify(step.headers) : (step.headers as string) ?? ""}
              onChange={(e) => {
                try {
                  const v = e.target.value.trim()
                  patch("headers", v ? JSON.parse(v) : undefined)
                } catch {
                  patch("headers", e.target.value)
                }
              }}
              placeholder='{"Authorization": "Bearer ..."}'
              disabled={disabled}
              className="h-9 font-mono text-xs"
            />
          </div>
          {(action !== "get" && action !== "GET") && (
            <div className="space-y-2">
              <Label>Body (JSON)</Label>
              <Input
                value={typeof step.body === "object" ? JSON.stringify(step.body) : (step.body as string) ?? ""}
                onChange={(e) => {
                  try {
                    const v = e.target.value.trim()
                    patch("body", v ? JSON.parse(v) : undefined)
                  } catch {
                    patch("body", e.target.value)
                  }
                }}
                placeholder="{}"
                disabled={disabled}
                className="h-9 font-mono text-xs"
              />
            </div>
          )}
        </>
      )}

      {cat === "database" && (
        <>
          <div className="space-y-2">
            <Label>Connection string</Label>
            <Input
              value={(step.connection_string as string) ?? ""}
              onChange={(e) => patch("connection_string", e.target.value)}
              placeholder="postgresql://..."
              disabled={disabled}
              className="h-9 font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label>Query</Label>
            <Input
              value={(step.query as string) ?? ""}
              onChange={(e) => patch("query", e.target.value)}
              placeholder="SELECT ..."
              disabled={disabled}
              className="h-9 font-mono text-xs"
            />
          </div>
        </>
      )}

      {cat === "file" && (
        <div className="space-y-2">
          <Label>File path</Label>
          <Input
            value={(step.file_path as string) ?? ""}
            onChange={(e) => patch("file_path", e.target.value)}
            placeholder="/path/to/file"
            disabled={disabled}
            className="h-9"
          />
        </div>
      )}

      {(cat === "generic" || !["web", "desktop", "api", "database", "file"].includes(cat)) && (
        <>
          <div className="space-y-2">
            <Label>Step ID</Label>
            <Input
              value={(step.step_id as string) ?? ""}
              onChange={(e) => patch("step_id", e.target.value)}
              placeholder="step_id"
              disabled={disabled}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label>Value / Target</Label>
            <Input
              value={(step.value as string) ?? (step.target as string) ?? ""}
              onChange={(e) => {
                if (action === "type" || action === "click") patch("target", e.target.value)
                else patch("value", e.target.value)
              }}
              placeholder="Value or selector"
              disabled={disabled}
              className="h-9"
            />
          </div>
        </>
      )}
    </div>
  )
}
