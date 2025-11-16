'use client';
import { useAppState } from '@/lib/providers/state-provider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import clsx from 'clsx';
import EmojiPicker from '../global/emoji-picker';
import { createFile, updateFile, updateFolder } from '@/lib/supabase/queries';
import { useToast } from '../ui/use-toast';
import TooltipComponent from '../global/tooltip-component';
import { PlusIcon, Trash, Heart } from 'lucide-react';
import { File } from '@/lib/supabase/supabase.types';
import { v4 } from 'uuid';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';

interface DropdownProps {
  title: string;
  id: string;
  listType: 'folder' | 'file';
  iconId: string;
  children?: React.ReactNode;
  disabled?: boolean;
  isFavoritesContext?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  title,
  id,
  listType,
  iconId,
  children,
  disabled,
  isFavoritesContext = false,
  ...props
}) => {
  const supabase = createClient();
  const { toast } = useToast();
  const { user } = useSupabaseUser();
  const { state, dispatch, workspaceId, folderId } = useAppState();
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  //folder Title synced with server data and local
  const folderTitle: string | undefined = useMemo(() => {
    if (listType === 'folder') {
      const stateTitle = state.workspaces
        .find((workspace) => workspace.id === workspaceId)
        ?.folders.find((folder) => folder.id === id)?.title;
      if (title === stateTitle || !stateTitle) return title;
      return stateTitle;
    }
  }, [state, listType, workspaceId, id, title]);

  //fileItitle

  const fileTitle: string | undefined = useMemo(() => {
    if (listType === 'file') {
      const fileAndFolderId = id.split('folder');
      const stateTitle = state.workspaces
        .find((workspace) => workspace.id === workspaceId)
        ?.folders.find((folder) => folder.id === fileAndFolderId[0])
        ?.files.find((file) => file.id === fileAndFolderId[1])?.title;
      if (title === stateTitle || !stateTitle) return title;
      return stateTitle;
    }
  }, [state, listType, workspaceId, id, title]);

  //Navigate the user to a different page
  const navigatatePage = (accordionId: string, type: string) => {
    if (type === 'folder') {
      router.push(`/dashboard/${workspaceId}/${accordionId}`);
    }
    if (type === 'file') {
      router.push(
        `/dashboard/${workspaceId}/${folderId}/${
          accordionId.split('folder')[1]
        }`
      );
    }
  };

  //double click handler
  const handleDoubleClick = () => {
    setIsEditing(true);
  };
  //blur

  const handleBlur = async () => {
    if (!isEditing) return;
    setIsEditing(false);
    const fId = id.split('folder');
    if (fId?.length === 1) {
      if (!folderTitle) return;
      toast({
        title: 'Success',
        description: 'Folder title changed.',
      });
      await updateFolder({ title }, fId[0]);
    }

    if (fId.length === 2 && fId[1]) {
      if (!fileTitle) return;
      const { data, error } = await updateFile({ title: fileTitle }, fId[1]);
      if (error) {
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Could not update the title for this file',
        });
      } else
        toast({
          title: 'Success',
          description: 'File title changed.',
        });
    }
  };

  //onchanges
  const onChangeEmoji = async (selectedEmoji: string) => {
    if (!workspaceId) return;
    if (listType === 'folder') {
      dispatch({
        type: 'UPDATE_FOLDER',
        payload: {
          workspaceId,
          folderId: id,
          folder: { iconId: selectedEmoji },
        },
      });
      const { data, error } = await updateFolder({ iconId: selectedEmoji }, id);
      if (error) {
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Could not update the emoji for this folder',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Update emoji for the folder',
        });
      }
    }
  };
  const folderTitleChange = (e: any) => {
    if (!workspaceId) return;
    const fid = id.split('folder');
    if (fid.length === 1) {
      dispatch({
        type: 'UPDATE_FOLDER',
        payload: {
          folder: { title: e.target.value },
          folderId: fid[0],
          workspaceId,
        },
      });
    }
  };
  const fileTitleChange = (e: any) => {
    if (!workspaceId || !folderId) return;
    const fid = id.split('folder');
    if (fid.length === 2 && fid[1]) {
      dispatch({
        type: 'UPDATE_FILE',
        payload: {
          file: { title: e.target.value },
          folderId,
          workspaceId,
          fileId: fid[1],
        },
      });
    }
  };

  //move to trash
  const moveToTrash = async () => {
    if (!user?.email || !workspaceId) return;
    const pathId = id.split('folder');
    if (listType === 'folder') {
      dispatch({
        type: 'UPDATE_FOLDER',
        payload: {
          folder: { inTrash: `Deleted by ${user?.email}` },
          folderId: pathId[0],
          workspaceId,
        },
      });
      const { data, error } = await updateFolder(
        { inTrash: `Deleted by ${user?.email}` },
        pathId[0]
      );
      if (error) {
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Could not move the folder to trash',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Moved folder to trash',
        });
      }
    }

    if (listType === 'file') {
      dispatch({
        type: 'UPDATE_FILE',
        payload: {
          file: { inTrash: `Deleted by ${user?.email}` },
          folderId: pathId[0],
          workspaceId,
          fileId: pathId[1],
        },
      });
      const { data, error } = await updateFile(
        { inTrash: `Deleted by ${user?.email}` },
        pathId[1]
      );
      if (error) {
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Could not move the folder to trash',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Moved folder to trash',
        });
      }
    }
  };

  const toggleFavorite = async () => {
    if (!user?.email || !workspaceId) return;
    const pathId = id.split('folder');

    if (listType === 'folder') {
      const currentFolder = state.workspaces
        .find((workspace) => workspace.id === workspaceId)
        ?.folders.find((folder) => folder.id === pathId[0]);

      const newFavoriteValue = currentFolder?.inFavorite
        ? null
        : `Favorited by ${user?.email}`;

      // Update the folder
      dispatch({
        type: 'UPDATE_FOLDER',
        payload: {
          folder: { inFavorite: newFavoriteValue },
          folderId: pathId[0],
          workspaceId,
        },
      });
      const { error } = await updateFolder(
        { inFavorite: newFavoriteValue },
        pathId[0]
      );

      // Only mark all files as favorite when FAVORITING the folder (not when unfavoriting)
      if (newFavoriteValue) {
        const files = currentFolder?.files || [];
        for (const file of files) {
          dispatch({
            type: 'UPDATE_FILE',
            payload: {
              file: { inFavorite: newFavoriteValue },
              folderId: pathId[0],
              workspaceId,
              fileId: file.id,
            },
          });
          await updateFile({ inFavorite: newFavoriteValue }, file.id);
        }
      }

      if (error) {
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Could not update favorite status',
        });
      } else {
        toast({
          title: 'Success',
          description: newFavoriteValue ? 'Added to favorites' : 'Removed from favorites',
        });
      }
    }

    if (listType === 'file') {
      const currentFile = state.workspaces
        .find((workspace) => workspace.id === workspaceId)
        ?.folders.find((folder) => folder.id === pathId[0])
        ?.files.find((file) => file.id === pathId[1]);

      const newFavoriteValue = currentFile?.inFavorite
        ? null
        : `Favorited by ${user?.email}`;

      dispatch({
        type: 'UPDATE_FILE',
        payload: {
          file: { inFavorite: newFavoriteValue },
          folderId: pathId[0],
          workspaceId,
          fileId: pathId[1],
        },
      });
      const { error } = await updateFile(
        { inFavorite: newFavoriteValue },
        pathId[1]
      );
      if (error) {
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Could not update favorite status',
        });
      } else {
        toast({
          title: 'Success',
          description: newFavoriteValue ? 'Added to favorites' : 'Removed from favorites',
        });
      }
    }
  };

  const isFolder = listType === 'folder';
  const groupIdentifies = clsx(
    'dark:text-white whitespace-nowrap flex justify-between items-center w-full relative',
    {
      'group/folder': isFolder,
      'group/file': !isFolder,
    }
  );

  const listStyles = useMemo(
    () =>
      clsx('relative', {
        'border-none text-md': isFolder,
        'border-none ml-6 text-[16px] py-1': !isFolder,
      }),
    [isFolder]
  );

  const hoverStyles = useMemo(
    () =>
      clsx(
        'h-full hidden rounded-sm absolute right-0 items-center justify-center',
        {
          'group-hover/file:flex': listType === 'file',
          'group-hover/folder:flex': listType === 'folder',
        }
      ),
    [isFolder]
  );

  const addNewFile = async () => {
    if (!workspaceId) return;
    const newFile: File = {
      folderId: id,
      data: null,
      createdAt: new Date().toISOString(),
      inTrash: null,
      inFavorite: null,
      title: 'Untitled',
      iconId: '📄',
      id: v4(),
      workspaceId,
      bannerUrl: '',
    };
    dispatch({
      type: 'ADD_FILE',
      payload: { file: newFile, folderId: id, workspaceId },
    });
    const { data, error } = await createFile(newFile);
    if (error) {
      toast({
        title: 'Error',
        variant: 'destructive',
        description: 'Could not create a file',
      });
    } else {
      toast({
        title: 'Success',
        description: 'File created.',
      });
    }
  };

  return (
    <AccordionItem
      value={id}
      className={listStyles}
      onClick={(e) => {
        e.stopPropagation();
        navigatatePage(id, listType);
      }}
    >
      <AccordionTrigger
        id={listType}
        className="hover:no-underline 
        p-2 
        dark:text-muted-foreground 
        text-sm"
        disabled={listType === 'file'}
      >
        <div className={groupIdentifies}>
          <div
            className="flex
          gap-4
          items-center
          justify-center
          overflow-hidden"
          >
            <div className="relative">
              <EmojiPicker getValue={onChangeEmoji}>{iconId}</EmojiPicker>
            </div>
            <input
              type="text"
              value={listType === 'folder' ? folderTitle : fileTitle}
              className={clsx(
                'outline-none overflow-hidden w-[140px] text-Neutrals/neutrals-7',
                {
                  'bg-muted cursor-text': isEditing,
                  'bg-transparent cursor-pointer': !isEditing,
                }
              )}
              readOnly={!isEditing}
              onDoubleClick={handleDoubleClick}
              onBlur={handleBlur}
              onChange={
                listType === 'folder' ? folderTitleChange : fileTitleChange
              }
            />
          </div>
          {!isEditing && (
            <div className={clsx(hoverStyles, 'gap-2')}>
              <div
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite();
                }}
              >
                <TooltipComponent message={
                  (listType === 'folder'
                    ? state.workspaces
                        .find((workspace) => workspace.id === workspaceId)
                        ?.folders.find((folder) => folder.id === id.split('folder')[0])?.inFavorite
                    : state.workspaces
                        .find((workspace) => workspace.id === workspaceId)
                        ?.folders.find((folder) => folder.id === id.split('folder')[0])
                        ?.files.find((file) => file.id === id.split('folder')[1])?.inFavorite
                  ) ? "Remove from favorites" : "Add to favorites"
                }>
                  <Heart
                    size={15}
                    className={clsx(
                      'transition-colors',
                      {
                        'fill-red-500 text-red-500':
                          listType === 'folder'
                            ? state.workspaces
                                .find((workspace) => workspace.id === workspaceId)
                                ?.folders.find((folder) => folder.id === id.split('folder')[0])?.inFavorite
                            : state.workspaces
                                .find((workspace) => workspace.id === workspaceId)
                                ?.folders.find((folder) => folder.id === id.split('folder')[0])
                                ?.files.find((file) => file.id === id.split('folder')[1])?.inFavorite,
                        'text-Neutrals/neutrals-7 hover:text-red-500':
                          !(listType === 'folder'
                            ? state.workspaces
                                .find((workspace) => workspace.id === workspaceId)
                                ?.folders.find((folder) => folder.id === id.split('folder')[0])?.inFavorite
                            : state.workspaces
                                .find((workspace) => workspace.id === workspaceId)
                                ?.folders.find((folder) => folder.id === id.split('folder')[0])
                                ?.files.find((file) => file.id === id.split('folder')[1])?.inFavorite)
                      }
                    )}
                  />
                </TooltipComponent>
              </div>
              {listType === 'folder' && (
                <TooltipComponent message="Add File">
                  <PlusIcon
                    onClick={addNewFile}
                    size={15}
                    strokeWidth={3}
                    className="hover:text-green-500 dark:text-Neutrals/neutrals-7 transition-colors"
                  />
                </TooltipComponent>
              )}
              <TooltipComponent message="Delete Folder">
                <Trash
                  onClick={moveToTrash}
                  size={15}
                  className="hover:text-red-500 dark:text-Neutrals/neutrals-7 transition-colors"
                />
              </TooltipComponent>
            </div>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {state.workspaces
          .find((workspace) => workspace.id === workspaceId)
          ?.folders.find((folder) => folder.id === id)
          ?.files.filter((file) => {
            // Always exclude trashed files
            if (file.inTrash) return false;

            // Only apply favorites filtering in favorites context
            if (isFavoritesContext) {
              const currentFolder = state.workspaces
                .find((workspace) => workspace.id === workspaceId)
                ?.folders.find((folder) => folder.id === id);

              if (currentFolder?.inFavorite) {
                return file.inFavorite;
              }
            }

            // Otherwise show all non-trashed files
            return true;
          })
          .map((file) => {
            const customFileId = `${id}folder${file.id}`;
            return (
              <Dropdown
                key={file.id}
                title={file.title}
                listType="file"
                id={customFileId}
                iconId={file.iconId}
                isFavoritesContext={isFavoritesContext}
              />
            );
          })}
      </AccordionContent>
    </AccordionItem>
  );
};

export default Dropdown;
