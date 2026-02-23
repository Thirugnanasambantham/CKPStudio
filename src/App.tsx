import { useThemeSync } from "@/hooks/use-theme"
import { Layout } from "@/components/Layout"
import { WorkflowView } from "@/components/WorkflowView"

function App() {
  useThemeSync()
  return (
    <Layout>
      <div className="flex-1 min-h-0 flex flex-col">
        <WorkflowView />
      </div>
    </Layout>
  )
}

export default App
