import { ReactNode } from 'react';
import { ClerkProvider as BaseClerkProvider } from '@clerk/clerk-react';

// Get Clerk publishable key from window (injected by Rails)
const CLERK_PUBLISHABLE_KEY =
  (window as unknown as { CLERK_PUBLISHABLE_KEY?: string }).CLERK_PUBLISHABLE_KEY ||
  (window as unknown as { ENV?: { CLERK_PUBLISHABLE_KEY?: string } }).ENV?.CLERK_PUBLISHABLE_KEY ||
  '';

interface ClerkProviderProps {
  children: ReactNode;
}

export function ClerkProvider({ children }: ClerkProviderProps) {
  // In development without Clerk key, render children directly
  if (!CLERK_PUBLISHABLE_KEY) {
    console.warn('[Clerk] No publishable key found. Auth will not work.');
    return <>{children}</>;
  }

  return (
    <BaseClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: {
          // Match the app's color scheme
          colorPrimary: '#f59e0b', // amber-500
          colorBackground: '#0f172a', // slate-900
          colorInputBackground: '#1e293b', // slate-800
          colorInputText: '#ffffff',
          colorTextOnPrimaryBackground: '#0f172a',
          colorText: '#ffffff',
          colorTextSecondary: '#94a3b8', // slate-400
          borderRadius: '0.75rem',
        },
        elements: {
          // Customize Clerk components to match app style
          card: 'bg-slate-900 border border-slate-800',
          headerTitle: 'text-white',
          headerSubtitle: 'text-slate-400',
          socialButtonsBlockButton: 'bg-slate-800 border-slate-700 hover:bg-slate-700',
          formFieldInput: 'bg-slate-800 border-slate-700 text-white',
          formButtonPrimary: 'bg-amber-500 hover:bg-amber-600 text-slate-900',
          footerActionLink: 'text-amber-500 hover:text-amber-400',
        },
      }}
      afterSignOutUrl="/app/login"
    >
      {children}
    </BaseClerkProvider>
  );
}
