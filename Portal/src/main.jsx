import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Show cached data instantly; refetch in background if older than 10s.
      staleTime: 10_000,
      // Keep unmounted query results in cache for 5 minutes before garbage-collecting,
      // so tab toggles within that window are instant.
      gcTime: 5 * 60_000,
      // Auto-refetch when the user comes back to the browser tab.
      refetchOnWindowFocus: true,
      // Don't retry forever on a failing endpoint — fail fast and let the UI show an error.
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
