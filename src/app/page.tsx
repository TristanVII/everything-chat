'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router
import React, { useEffect } from 'react';

export default function RootPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect to /home if the user is authenticated
    if (status === 'authenticated') {
      router.push('/home');
    }

    else if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  return <div>Checking authentication...</div>;
}
