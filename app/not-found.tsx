import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page not found</h2>
        <p className="text-slate-300 mb-8">The page you're looking for doesn't exist.</p>
        <Link
          href="/"
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold inline-block"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
