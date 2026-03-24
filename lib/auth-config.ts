import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'
import type { UserRole } from '@/lib/auth'

const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 6,
  admin: 5,
  sales_manager: 4,
  backoffice: 3,
  agent: 2,
  customer: 1,
}


async function resolveUserRole(userId: string): Promise<UserRole> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  })

  if (userRoles.length === 0) return 'customer'

  const sorted = userRoles.sort(
    (a, b) => (ROLE_PRIORITY[b.role.name] || 0) - (ROLE_PRIORITY[a.role.name] || 0)
  )

  return sorted[0].role.name as UserRole
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            status: true,
            image: true,
            orgId: true,
            deletedAt: true,
          },
        })

        if (!user) {
          throw new Error('Invalid email or password')
        }

        if (user.deletedAt) {
          throw new Error('This account has been deleted')
        }

        if (user.status === 'suspended') {
          throw new Error('Account is suspended. Contact your administrator.')
        }
        if (user.status === 'inactive') {
          throw new Error('Account is inactive. Contact your administrator.')
        }

        if (!user.password) {
          throw new Error('Password login is not configured for this account')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('Invalid email or password')
        }

        const role = await resolveUserRole(user.id)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role,
          orgId: user.orgId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id: string; role: UserRole; orgId: string }
        token.id = u.id
        token.role = u.role
        token.orgId = u.orgId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.orgId = token.orgId
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    async signIn() {
      return true
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}
