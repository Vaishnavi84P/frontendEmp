// app/layout.tsx
// Root layout - wraps every page with AuthProvider
// Also loads the Google Fonts we use throughout the app

import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { AuthProvider } from '../src/context/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title:       'xLM Onboard',
  description: 'AI-Powered Employee Onboarding Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Syne for headings, DM Sans for body text */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}