'use client';
import { useEffect } from 'react';
import useStore from '@/store/useStore';
import Login from '@/components/Login';
import AppShell from '@/components/AppShell';

export default function Home() {
  const { token, restoreSession } = useStore();

  useEffect(() => {
    restoreSession();
  }, []);

  if (!token) return <Login />;
  return <AppShell />;
}
