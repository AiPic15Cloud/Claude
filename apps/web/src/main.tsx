import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { queryClient } from '@/lib/query-client';
import { useThemeStore } from '@/store/theme.store';
import { registerServiceWorker } from '@/lib/push';
import App from './App';
import './index.css';

useThemeStore.getState().setTheme(useThemeStore.getState().theme);

// Registering here (not gated behind login) means the service worker is
// already installed and activated by the time a user visits the profile
// page to opt into push — subscribing on first click instead of needing a
// second visit for the SW to be ready.
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider delayDuration={200}>
          <App />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
