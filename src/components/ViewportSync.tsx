import { useEffect, useRef } from "react"
import { useStore } from "reactflow"

/** [x, y, zoom] from React Flow store */
export type FlowTransform = [number, number, number]

/**
 * Syncs React Flow transform to a ref so parent can convert screen to flow coordinates.
 * flowX = (clientX - rect.left - transform[0]) / transform[2]
 */
export function ViewportSync({
  transformRef,
}: {
  transformRef: React.RefObject<FlowTransform | null>
}) {
  const transform = useStore((s) => (s as { transform?: number[] }).transform ?? [0, 0, 1])
  const t: FlowTransform = [transform[0] ?? 0, transform[1] ?? 0, transform[2] ?? 1]
  const ref = useRef<FlowTransform>(t)
  ref.current = t

  useEffect(() => {
    if (transformRef && "current" in transformRef) {
      (transformRef as React.MutableRefObject<FlowTransform | null>).current = ref.current
    }
    return () => {
      if (transformRef && "current" in transformRef) {
        (transformRef as React.MutableRefObject<FlowTransform | null>).current = null
      }
    }
  }, [transformRef])

  return null
}
