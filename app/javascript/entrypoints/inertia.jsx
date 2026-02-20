import { createInertiaApp } from "@inertiajs/react"
import { createRoot } from "react-dom/client"

createInertiaApp({
  resolve: async (name) => {
    const pages = import.meta.glob("../pages/**/*.jsx")
    const path = `../pages/${name}.jsx`
    const loader = pages[path]
    if (!loader) throw new Error(`Inertia page not found: ${name}`)
    const module = await loader()
    return module.default
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
  progress: {
    color: "#3b82f6",
    showSpinner: true,
  },
})
