'use client';
// app/page.tsx
// Root route - just figures out where to send the user
// If they're logged in go to dashboard, otherwise go to login

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../src/context/AuthContext';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // wait until auth context finishes checking localStorage
      router.replace(user ? '/dashboard' : '/login');
    }
  }, [user, loading]);

  // show nothing while we figure out where to redirect
  return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  );
}