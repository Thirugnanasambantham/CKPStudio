import { useEffect } from "react"
import { useReactFlow } from "reactflow"

interface FitViewHelperProps {
  nodeCount: number
}

/**
 * Calls fitView when the number of nodes changes (e.g. after JSON load)
 * so the graph is visible in the viewport.
 */
export function FitViewHelper({ nodeCount }: FitViewHelperProps) {
  const { fitView } = useReactFlow()

  useEffect(() => {
    if (nodeCount === 0) return
    let t: ReturnType<typeof setTimeout>
    const raf = requestAnimationFrame(() => {
      t = setTimeout(() => {
        fitView({ padding: 0.2, duration: 250 })
      }, 350)
    })
    return () => {
      cancelAnimationFrame(raf)
      if (t != null) clearTimeout(t)
    }
  }, [nodeCount, fitView])

  return null
}
