'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    CredentialsSignin: 'Invalid email or password',
    AccessDenied: 'Access denied',
    OAuthSignin: 'Error connecting OAuth provider',
    OAuthCallback: 'Error in OAuth callback',
    EmailSigninError: 'Error sending signin email',
    SessionCallback: 'Session callback error',
    Callback: 'Callback error',
  };

  const message = error ? errorMessages[error] || error : 'An authentication error occurred';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center text-white max-w-md">
        <h1 className="text-3xl font-bold mb-4">Authentication Error</h1>
        <p className="text-slate-300 mb-6">{message}</p>
        <Link
          href="/login"
          className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
