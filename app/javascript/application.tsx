import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ClerkProvider } from './providers/ClerkProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { Transactions } from './pages/Transactions';
import { Invoices } from './pages/Invoices';
import { Clients } from './pages/Clients';
import { CreateInvoice } from './pages/CreateInvoice';
import { Settings } from './pages/Settings';
import { RecurringInvoices } from './pages/RecurringInvoices';
import { Documents } from './pages/Documents';
import { Workflows } from './pages/Workflows';
import { WorkflowBuilder } from './pages/WorkflowBuilder';
import { Login } from './pages/Login';
import { SSOCallback } from './pages/SSOCallback';
import { GmailCallback } from './pages/GmailCallback';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Onboarding is now handled via modal in Layout component
  return <>{children}</>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <BrowserRouter basename="/app">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/sso-callback" element={<SSOCallback />} />

                {/* Protected routes - Onboarding handled via modal in Layout */}
                {/* Gmail OAuth callback - protected but outside Layout */}
                <Route
                  path="/gmail/callback"
                  element={
                    <ProtectedRoute>
                      <GmailCallback />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="upload" element={<Upload />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="invoices" element={<Invoices />} />
                  <Route path="invoices/new" element={<CreateInvoice />} />
                  <Route path="invoices/:id/edit" element={<CreateInvoice />} />
                  <Route path="clients" element={<Clients />} />
                  <Route path="recurring-invoices" element={<RecurringInvoices />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="workflows" element={<Workflows />} />
                  <Route path="workflows/new" element={<WorkflowBuilder />} />
                  <Route path="workflows/:id/edit" element={<WorkflowBuilder />} />
                  <Route path="settings" element={<Settings />} />
                </Route>

                {/* Catch all - redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </WorkspaceProvider>
        </AuthProvider>
      </ClerkProvider>
    </QueryClientProvider>
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<App />);
  }
});
