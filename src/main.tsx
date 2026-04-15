import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { TooltipProvider } from '@/components/ui/tooltip';
import '@/styles/globals.css';
import { Toaster } from './components/ui/sonner.tsx';
import { ThemeProvider } from '@/components/theme-provider';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <TooltipProvider>
                <App />
            </TooltipProvider>
            <Toaster position="top-center" richColors />
        </ThemeProvider>
    </StrictMode>
);
