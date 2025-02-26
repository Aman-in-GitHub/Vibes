import './index.css';
import App from './App';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { BrowserRouter } from 'react-router';
import AuthProvider from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import Error from '@/components/Error';

function PWAUpdater() {
  useRegisterSW({
    onRegisterError(error) {
      console.error('SW registration failed', error);
    },
    onRegistered(registration) {
      if (registration) {
        setInterval(
          () => {
            registration.update();
          },
          5 * 60 * 1000
        );
      }
    },
    onNeedRefresh() {
      toast.info(
        'Update available. App will automatically update on next launch'
      );
    }
  });

  return null;
}

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary
    fallbackRender={({ error, resetErrorBoundary }) => (
      <Error error={error} reset={resetErrorBoundary} />
    )}
  >
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <PWAUpdater />
          <App />
          <Toaster richColors={true} position="top-center" duration={1500} />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);
