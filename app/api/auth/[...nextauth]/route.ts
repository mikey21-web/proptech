export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import NextAuth from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth-config'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const handler = NextAuth(authOptions)

export { handler as GET }

// Wrap POST to add rate limiting on sign-in attempts
export async function POST(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
  const segments = ctx.params.nextauth
  const isSignIn = segments?.includes('callback') && segments?.includes('credentials')

  if (isSignIn) {
    const ip = getClientIp(req)
    const { allowed, remaining, resetTime } = checkRateLimit(`login:${ip}`)

    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Remaining': '0',
          },
        },
      )
    }
  }

  return handler(req, ctx)
}
