'use client';
import { useAppState } from '@/lib/providers/state-provider';
import React, { useEffect, useState } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import FavoritesDropdownList from './favorites-dropdown-list';

interface FavoritesScrollAreaProps {
  workspaceId: string;
}

const FavoritesScrollArea: React.FC<FavoritesScrollAreaProps> = ({
  workspaceId,
}) => {
  const { state } = useAppState();
  const [hasFavorites, setHasFavorites] = useState(false);

  useEffect(() => {
    const workspace = state.workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      setHasFavorites(false);
      return;
    }

    // Check if there are any favorited folders with at least one favorited file
    const hasFavoritedFolders = workspace.folders.some(
      (folder) => folder.inFavorite && !folder.inTrash &&
        folder.files.some((file) => file.inFavorite && !file.inTrash)
    );

    // Check if there are any favorited files whose parent folder is NOT favorited
    const hasFavoritedFiles = workspace.folders.some((folder) =>
      !folder.inTrash && !folder.inFavorite &&
      folder.files.some((file) => file.inFavorite && !file.inTrash)
    );

    setHasFavorites(hasFavoritedFolders || hasFavoritedFiles);
  }, [state, workspaceId]);

  // Don't render if there are no favorites
  if (!hasFavorites) return null;

  return (
    <ScrollArea type="always" className="relative h-[200px]">
      <FavoritesDropdownList workspaceId={workspaceId} />
    </ScrollArea>
  );
};

export default FavoritesScrollArea;
