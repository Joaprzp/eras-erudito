import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'

import { AppProviders } from './convex'
import { router } from './router'
import './styles.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('No se encontró el elemento raíz de la aplicación.')
}

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
