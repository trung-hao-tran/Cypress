'use client';
import { useAppState } from '@/lib/providers/state-provider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import React from 'react';
import { Button } from '../ui/button';

interface LogoutButtonProps {
  children: React.ReactNode;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ children }) => {
  const { dispatch } = useAppState();
  const router = useRouter();
  const supabase = createClient();
  const logout = async () => {
    dispatch({ type: 'SET_WORKSPACES', payload: { workspaces: [] } });
    await supabase.auth.signOut();
    router.refresh(); // Force refresh server components
    router.replace('/login');
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      className="p-0"
      onClick={logout}
    >
      {children}
    </Button>
  );
};

export default LogoutButton;
