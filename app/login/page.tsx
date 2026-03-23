'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@clickprops.in')
  const [password, setPassword] = useState('ClickProps@2026')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState('admin')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      console.log('signIn result:', result)

      if (result?.ok) {
        // Redirect based on role
        if (userRole === 'agent') {
          router.push('/agent')
        } else {
          router.push('/admin')
        }
        router.refresh()
      } else {
        setError(result?.error || 'Login failed. Check credentials.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Network error. Is the server running?')
    }
    setLoading(false)
  }

  const setDemoAdmin = () => {
    setEmail('admin@clickprops.in')
    setPassword('ClickProps@2026')
    setUserRole('admin')
  }

  const setDemoAgent = () => {
    setEmail('agent@clickprops.in')
    setPassword('ClickProps@2026')
    setUserRole('agent')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h1 className="text-4xl font-bold mb-2 text-center text-slate-900">ClickProps CRM</h1>
        <p className="text-center text-slate-500 mb-6">Real Estate Lead Management</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        {/* Quick demo buttons */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-600 mb-3 font-semibold">Quick Demo Access:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={setDemoAdmin}
              className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg transition"
            >
              👨‍💼 Admin
            </button>
            <button
              type="button"
              onClick={setDemoAgent}
              className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg transition"
            >
              🧑‍💼 Agent
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-6 text-center">
          📍 <strong>For 2D Map Demo:</strong> Click "Agent" button above, then Sign In
        </p>
      </form>
    </div>
  )
}
