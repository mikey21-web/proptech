import type { DefaultSession, NextAuthOptions } from 'next-auth';
import type { UserRole } from '@/lib/auth';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: DefaultSession['user'] & {
      id: string;
      role: UserRole;
      orgId: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: UserRole;
    orgId: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    orgId: string;
  }
}
