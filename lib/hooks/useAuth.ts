'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import type { UserRole } from '@/lib/auth';

export interface UseAuthReturn {
  session: any;
  status: 'authenticated' | 'loading' | 'unauthenticated';
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    image: string | null;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

/**
 * Client-side hook for authentication
 * Use in Client Components only
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  const handleSignIn = async (email: string, password: string) => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    return result;
  };

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  const user = (session?.user as UseAuthReturn['user']) || null;

  const hasRoleCheck = (roleOrRoles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    return roles.includes(user.role);
  };

  return {
    session,
    status,
    user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    signIn: handleSignIn,
    signOut: handleSignOut,
    hasRole: hasRoleCheck,
  };
}
