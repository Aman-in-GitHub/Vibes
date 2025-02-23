import './index.css';
import App from './App';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import Error from '@/components/Error';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary
    fallbackRender={({ error, resetErrorBoundary }) => (
      <Error error={error} reset={resetErrorBoundary} />
    )}
  >
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster richColors={true} position="top-center" />
    </QueryClientProvider>
  </ErrorBoundary>
);
