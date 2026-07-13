import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/theme-provider';
import '@/styles/globals.css';
import { TooltipProvider } from './components/ui/tooltip';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
            <TooltipProvider>
                <main>
                    <RouterProvider router={router} />
                </main>
                <Toaster />
            </TooltipProvider>
        </ThemeProvider>
    </StrictMode>
);
