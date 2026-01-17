import type { ApiRequestOptions } from './ApiRequestOptions';

type Headers = Record<string, string>;
type Middleware<T> = (value: T) => T | Promise<T>;
type Resolver<T> = (options: ApiRequestOptions) => Promise<T>;

export class Interceptors<T> {
  _fns: Middleware<T>[];

  constructor() {
    this._fns = [];
  }

  eject(fn: Middleware<T>) {
    const index = this._fns.indexOf(fn);
    if (index !== -1) {
      this._fns = [...this._fns.slice(0, index), ...this._fns.slice(index + 1)];
    }
  }

  use(fn: Middleware<T>) {
    this._fns = [...this._fns, fn];
  }
}


function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || '';
}

// Store reference to getToken function from React context
let clerkGetTokenFn: (() => Promise<string | null>) | null = null;

/**
 * Set the Clerk getToken function from React context.
 * Called by AuthProvider when it mounts.
 */
export function setClerkTokenGetter(fn: () => Promise<string | null>): void {
  clerkGetTokenFn = fn;
}

/**
 * Clear the Clerk getToken function.
 * Called when user logs out.
 */
export function clearClerkTokenGetter(): void {
  clerkGetTokenFn = null;
}

export async function getClerkToken(): Promise<string | null> {
  // Use the React context's getToken function if available
  if (clerkGetTokenFn) {
    try {
      return await clerkGetTokenFn();
    } catch (error) {
      console.warn('[getClerkToken] Failed to get token from context:', error);
    }
  }

  // Fallback: Try to access Clerk instance directly from window
  try {
    const clerk = (window as any).Clerk;

    // Wait for Clerk to be loaded if it exists but isn't ready
    if (clerk && typeof clerk.load === 'function' && !clerk.loaded) {
      await clerk.load();
    }

    // Try to get token from active session
    if (clerk?.session) {
      const token = await clerk.session.getToken();
      return token || null;
    }
  } catch (error) {
    console.warn('[getClerkToken] Failed to get token from window.Clerk:', error);
  }

  return null;
}

export type OpenAPIConfig = {
	BASE: string;
	CREDENTIALS: 'include' | 'omit' | 'same-origin';
	ENCODE_PATH?: ((path: string) => string) | undefined;
	HEADERS?: Headers | Resolver<Headers> | undefined;
	PASSWORD?: string | Resolver<string> | undefined;
	TOKEN?: string | Resolver<string> | undefined;
	USERNAME?: string | Resolver<string> | undefined;
	VERSION: string;
	WITH_CREDENTIALS: boolean;
	interceptors: {
		request: Interceptors<RequestInit>;
		response: Interceptors<Response>;
	};
};

export const OpenAPI: OpenAPIConfig = {
	BASE: '/api',
	CREDENTIALS: 'include',
	ENCODE_PATH: undefined,
	HEADERS: {
		'X-CSRF-Token': getCsrfToken(),
		'Content-Type': 'application/json',
	},
	PASSWORD: undefined,
	// Use the getClerkToken function to provide auth token for all API requests
	TOKEN: getClerkToken,
	USERNAME: undefined,
	VERSION: '0.0.1',
	WITH_CREDENTIALS: false,
	interceptors: {
		request: new Interceptors(),
		response: new Interceptors(),
	},
};