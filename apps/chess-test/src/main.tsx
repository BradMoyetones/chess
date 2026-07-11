import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router'
import { router } from './router'
import { Toaster } from './components/ui/sonner'
import { ThemeProvider } from './components/theme-provider'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            disableTransitionOnChange
        >
            <main className='bg-muted'>
                <RouterProvider router={router} />
            </main>
            <Toaster />
        </ThemeProvider>
    </StrictMode>,
)
