import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useGmailCallback } from '../queries/useGmail';

export function GmailCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gmailCallback = useGmailCallback();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage(error === 'access_denied' ? 'Access was denied' : error);
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setErrorMessage('Missing authorization code or state');
      return;
    }

    // Call the API to complete OAuth
    gmailCallback.mutate(
      { code, state },
      {
        onSuccess: () => {
          setStatus('success');
          // Redirect to invoices page after a brief success message
          setTimeout(() => {
            navigate('/invoices', { replace: true });
          }, 2000);
        },
        onError: (err) => {
          setStatus('error');
          setErrorMessage(err.message || 'Failed to connect Gmail');
        },
      }
    );
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Connecting Gmail...
            </h2>
            <p className="text-slate-500">
              Please wait while we complete the connection.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Gmail Connected!
            </h2>
            <p className="text-slate-500">
              Redirecting to invoices...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Connection Failed
            </h2>
            <p className="text-slate-500 mb-6">{errorMessage}</p>
            <button
              onClick={() => navigate('/invoices', { replace: true })}
              className="px-6 py-2.5 bg-amber-200 text-slate-900 rounded-lg font-medium hover:bg-amber-300 transition-colors"
            >
              Go to Invoices
            </button>
          </>
        )}
      </div>
    </div>
  );
}
