import type { Metadata, Viewport } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClickProps CRM',
  description: 'Real Estate CRM for Sri Sai Builders',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
