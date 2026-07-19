import { ConvexProvider, ConvexReactClient } from 'convex/react'
import type { ReactNode } from 'react'

const deploymentUrl = import.meta.env.VITE_CONVEX_URL

if (!deploymentUrl) {
  throw new Error('Falta VITE_CONVEX_URL. Ejecutá `bunx convex dev` para configurar Convex.')
}

const convex = new ConvexReactClient(deploymentUrl)

export function AppProviders({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
