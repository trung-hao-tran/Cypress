import { createServerClient } from '@supabase/ssr';
import React from 'react';

import { cookies } from 'next/headers';
import {
  getCollaboratingWorkspaces,
  getFolders,
  getPrivateWorkspaces,
  getSharedWorkspaces,
  getUserSubscriptionStatus,
} from '@/lib/supabase/queries';
import { redirect } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import WorkspaceDropdown from './workspace-dropdown';
import PlanUsage from './plan-usage';
import NativeNavigation from './native-navigation';
import { ScrollArea } from '../ui/scroll-area';
import FoldersDropdownList from './folders-dropdown-list';
import FavoritesScrollArea from './favorites-scroll-area';
import UserCard from './user-card';

interface SidebarProps {
  params: Promise<{ workspaceId: string }>;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = async ({ params, className }) => {
  const { workspaceId } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
  //user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  //subscr
  const { data: subscriptionData, error: subscriptionError } =
    await getUserSubscriptionStatus(user.id);

  //folders
  const { data: workspaceFolderData, error: foldersError } = await getFolders(
    workspaceId
  );
  //error
  if (subscriptionError || foldersError) redirect('/dashboard');

  const [privateWorkspaces, collaboratingWorkspaces, sharedWorkspaces] =
    await Promise.all([
      getPrivateWorkspaces(user.id),
      getCollaboratingWorkspaces(user.id),
      getSharedWorkspaces(user.id),
    ]);

  //get all the different workspaces private collaborating shared
  return (
    <aside
      className={twMerge(
        'hidden sm:flex sm:flex-col w-[280px] shrink-0 p-4 md:gap-4 justify-between!',
        className
      )}
    >
      <div>
        <WorkspaceDropdown
          privateWorkspaces={privateWorkspaces}
          sharedWorkspaces={sharedWorkspaces}
          collaboratingWorkspaces={collaboratingWorkspaces}
          defaultValue={[
            ...privateWorkspaces,
            ...collaboratingWorkspaces,
            ...sharedWorkspaces,
          ].find((workspace) => workspace.id === workspaceId)}
        />
        <PlanUsage
          foldersLength={workspaceFolderData?.length || 0}
          subscription={subscriptionData}
        />
        <NativeNavigation myWorkspaceId={workspaceId} />
        <FavoritesScrollArea workspaceId={workspaceId} />
        <ScrollArea
          type="always"
          className="relative h-[250px]"
        >
          <FoldersDropdownList
            workspaceFolders={workspaceFolderData || []}
            workspaceId={workspaceId}
          />
        </ScrollArea>
      </div>
      <UserCard subscription={subscriptionData} />
    </aside>
  );
};

export default Sidebar;
