import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import ClientOnly from '@/components/ClientOnly';
import StoreProvider from '@/components/StoreProvider';
import { ToastProvider } from '@/components/Toast';
import { Version } from '@/components/Version';

const geistSans = Geist({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Car Wars 6e Car Builder',
  description: 'Build and organize your Car Wars 6th Edition vehicle cards and decks',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.className} antialiased bg-gray-900 text-gray-100 h-full overflow-hidden`}
      >
        <StoreProvider>
          <ToastProvider>
            <ClientOnly>
              <div className="p-2 h-full box-border">{children}</div>
            </ClientOnly>
          </ToastProvider>
        </StoreProvider>
        <Version />
      </body>
    </html>
  );
}
