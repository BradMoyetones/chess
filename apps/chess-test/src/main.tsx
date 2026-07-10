import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router'
import { router } from './router'
import { Toaster } from './components/ui/sonner'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RouterProvider router={router} />
        <Toaster />
    </StrictMode>,
)
