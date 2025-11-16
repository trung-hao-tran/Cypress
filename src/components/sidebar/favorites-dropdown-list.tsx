'use client';
import { useAppState } from '@/lib/providers/state-provider';
import React, { useEffect, useState } from 'react';
import { Accordion } from '../ui/accordion';
import Dropdown from './Dropdown';
import useSupabaseRealtime from '@/lib/hooks/useSupabaseRealtime';
import { File, Folder } from '@/lib/supabase/supabase.types';

interface FavoritesDropdownListProps {
  workspaceId: string;
}

const FavoritesDropdownList: React.FC<FavoritesDropdownListProps> = ({
  workspaceId,
}) => {
  useSupabaseRealtime();
  const { state, folderId } = useAppState();
  const [favoritedFolders, setFavoritedFolders] = useState<Folder[]>([]);
  const [favoritedFiles, setFavoritedFiles] = useState<File[]>([]);

  useEffect(() => {
    const workspace = state.workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return;

    // Get favorited folders that have at least one favorited file
    const folders = workspace.folders.filter(
      (folder) => folder.inFavorite && !folder.inTrash &&
        folder.files.some((file) => file.inFavorite && !file.inTrash)
    );
    setFavoritedFolders(folders);

    // Get favorited files ONLY if their parent folder is NOT favorited
    const files: File[] = [];
    workspace.folders.forEach((folder) => {
      // Only include files if the parent folder is not favorited
      if (!folder.inTrash && !folder.inFavorite) {
        folder.files.forEach((file) => {
          if (file.inFavorite && !file.inTrash) {
            files.push(file);
          }
        });
      }
    });
    setFavoritedFiles(files);
  }, [state, workspaceId]);

  const hasNoFavorites = favoritedFolders.length === 0 && favoritedFiles.length === 0;

  // Don't render anything if there are no favorites
  if (hasNoFavorites) return null;

  return (
    <>
      <div
        className="flex
        sticky
        z-20
        top-0
        bg-background
        w-full
        h-10
        group/title
        justify-between
        items-center
        pr-4
        text-Neutrals/neutrals-8
  "
      >
        <span
          className="text-Neutrals-8
        font-bold
        text-xs"
        >
          FAVORITES
        </span>
      </div>
      <Accordion
        type="multiple"
        defaultValue={[folderId || '']}
        className="pb-4"
      >
        {favoritedFolders.map((folder) => (
          <Dropdown
            key={folder.id}
            title={folder.title}
            listType="folder"
            id={folder.id}
            iconId={folder.iconId}
            isFavoritesContext={true}
          />
        ))}
        {favoritedFiles.map((file) => {
          const customFileId = `${file.folderId}folder${file.id}`;
          return (
            <Dropdown
              key={file.id}
              title={file.title}
              listType="file"
              id={customFileId}
              iconId={file.iconId}
              isFavoritesContext={true}
            />
          );
        })}
      </Accordion>
    </>
  );
};

export default FavoritesDropdownList;
