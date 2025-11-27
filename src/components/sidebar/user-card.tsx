'use client';
import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import CypressProfileIcon from '../icons/cypressProfileIcon';
import ModeToggle from '../global/mode-toggle';
import UserProfile from '../user-profile/user-profile';
import LogoutButton from '../global/logout-button';
import { LogOut } from 'lucide-react';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';
import { createClient } from '@/lib/supabase/client';

const UserCard: React.FC = () => {
  const { user, subscription } = useSupabaseUser();
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    const loadAvatar = async () => {
      if (!user) return;

      const supabase = createClient();
      const { data } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (data && data.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };

    loadAvatar();

    // Listen for avatar updates
    const handleAvatarUpdate = (event: any) => {
      setAvatarUrl(event.detail.avatarUrl);
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate);

    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
    };
  }, [user]);

  return (
    <article
      className="hidden
      sm:flex
      justify-between
      items-center
      px-4
      py-2
      dark:bg-Neutrals/neutrals-12
      rounded-3xl
  "
    >
      <UserProfile>
        <aside className="flex justify-center items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <Avatar>
            <AvatarImage src={avatarUrl} />
            <AvatarFallback>
              <CypressProfileIcon />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-muted-foreground">
              {subscription?.status === 'active' ? 'Pro Plan' : 'Free Plan'}
            </span>
            <small
              className="w-[100px]
            overflow-hidden
            overflow-ellipsis
            "
            >
              {user?.email}
            </small>
          </div>
        </aside>
      </UserProfile>
      <div className="flex items-center justify-center">
        <LogoutButton>
          <LogOut />
        </LogoutButton>
        <ModeToggle />
      </div>
    </article>
  );
};

export default UserCard;
