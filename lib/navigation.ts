import type { UserRole } from '@/lib/auth';
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  IndianRupee,
  UserCircle,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  Shield,
  UsersRound,
  Target,
  CreditCard,
  Map,
  ScrollText,
  Grid3X3,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Get navigation items based on user role
 */
export function getNavigation(role: UserRole): NavSection[] {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return adminNavigation;
    case 'sales_manager':
      return salesManagerNavigation;
    case 'agent':
      return agentNavigation;
    case 'customer':
      return customerNavigation;
    default:
      return customerNavigation;
  }
}

/**
 * Get the default redirect path for a role after login
 */
export function getRoleRedirectPath(role: UserRole): string {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return '/admin';
    case 'sales_manager':
      return '/admin';
    case 'agent':
      return '/agent';
    case 'customer':
      return '/customer';
    case 'backoffice':
      return '/admin';
    default:
      return '/';
  }
}

const agentNavigation: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/agent', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'My Leads', href: '/agent/leads', icon: Users },
      { label: 'My Bookings', href: '/agent/bookings', icon: BookOpen },
      { label: 'Commission', href: '/agent/commissions', icon: IndianRupee },
    ],
  },
  {
    title: 'Team',
    items: [
      { label: 'My Team', href: '/agent/team', icon: UsersRound },
    ],
  },
];

const customerNavigation: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/customer', icon: LayoutDashboard },
    ],
  },
  {
    title: 'My Property',
    items: [
      { label: 'Bookings', href: '/customer/bookings', icon: BookOpen },
      { label: 'Payments', href: '/customer/payments', icon: IndianRupee },
      { label: 'Documents', href: '/customer/documents', icon: FileText },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Messages', href: '/customer/messages', icon: MessageSquare },
    ],
  },
];

const adminNavigation: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    title: 'CRM',
    items: [
      { label: 'Leads', href: '/admin/leads', icon: Target },
      { label: 'Customers', href: '/admin/customers', icon: UserCircle },
      { label: 'Agents', href: '/admin/agents', icon: UsersRound },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Projects', href: '/admin/projects', icon: Building2 },
      { label: 'Bookings', href: '/admin/bookings', icon: BookOpen },
      { label: 'Inventory', href: '/admin/inventory', icon: Map },
      { label: '2D Layout', href: '/admin/layout', icon: Grid3X3 },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Payments', href: '/admin/payments', icon: CreditCard },
      { label: 'Commissions', href: '/admin/commissions', icon: IndianRupee },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
      { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
      { label: 'Audit Log', href: '/admin/audit', icon: ScrollText },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Team', href: '/admin/team', icon: UsersRound },
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
      { label: 'Configuration', href: '/admin/configuration', icon: Settings },
      { label: 'Roles & Permissions', href: '/admin/roles', icon: Shield },
    ],
  },
];

const salesManagerNavigation: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    title: 'CRM',
    items: [
      { label: 'Leads', href: '/admin/leads', icon: Target },
      { label: 'Customers', href: '/admin/customers', icon: UserCircle },
      { label: 'Agents', href: '/admin/agents', icon: UsersRound },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Projects', href: '/admin/projects', icon: Building2 },
      { label: 'Bookings', href: '/admin/bookings', icon: BookOpen },
      { label: 'Inventory', href: '/admin/inventory', icon: Map },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Commissions', href: '/admin/commissions', icon: IndianRupee },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
];
