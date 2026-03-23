'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center text-white">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="text-slate-300 mb-6">{error.message}</p>
        <button
          onClick={() => reset()}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
