import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

interface JsonEditorProps {
  label?: string
  value: unknown
  onChange: (value: unknown) => void
  className?: string
  disabled?: boolean
}

function tryParseJson(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (trimmed === "") return { ok: true, value: undefined }
  try {
    const value = JSON.parse(trimmed)
    return { ok: true, value }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" }
  }
}

export function JsonEditor({ label, value, onChange, className, disabled }: JsonEditorProps) {
  const [raw, setRaw] = useState(() =>
    value === undefined || value === null ? "" : JSON.stringify(value, null, 2),
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const next = value === undefined || value === null ? "" : JSON.stringify(value, null, 2)
    setRaw(next)
    setError(null)
  }, [value])

  const handleBlur = useCallback(() => {
    const result = tryParseJson(raw)
    if (result.ok) {
      setError(null)
      onChange(result.value)
    } else {
      setError(result.error)
    }
  }, [raw, onChange])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRaw(e.target.value)
    const result = tryParseJson(e.target.value)
    setError(result.ok ? null : result.error)
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label className="text-muted-foreground">{label}</Label>}
      <textarea
        value={raw}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        rows={4}
        className={cn(
          "w-full rounded-md border bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-destructive" : "border-input",
        )}
        spellCheck={false}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
