'use client';
import React, { useState } from 'react';
import { useToast } from '../ui/use-toast';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  CreditCard,
  User as UserIcon,
} from 'lucide-react';
import { Separator } from '../ui/separator';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import CypressProfileIcon from '../icons/cypressProfileIcon';
import { useSubscriptionModal } from '@/lib/providers/subscription-modal-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import Loader from '../global/Loader';

const UserProfileForm = () => {
  const { toast } = useToast();
  const { user, subscription, refreshSubscription } = useSupabaseUser();
  const { setOpen } = useSubscriptionModal();
  const router = useRouter();
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>('');

  React.useEffect(() => {
    const loadUserAvatar = async () => {
      if (user) {
        const supabase = createClient();
        const { data } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        if (data && data.avatar_url) {
          setProfilePictureUrl(data.avatar_url);
        }
      }
    };

    loadUserAvatar();
  }, [user]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Error',
          description: 'Only JPG, PNG, GIF, and WebP images are allowed',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'File size must be less than 2MB',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUploadProfilePicture = async () => {
    if (!selectedFile || !user) return;

    try {
      setUploadingProfilePic(true);
      const supabase = createClient();

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) {
        console.error('[STORAGE_UPLOAD_ERROR]', uploadError);
        throw new Error(uploadError.message || 'Failed to upload to storage');
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('[UPDATE_USER_ERROR]', updateError);
        throw new Error(updateError.message || 'Failed to update user profile');
      }

      setProfilePictureUrl(publicUrl);
      setSelectedFile(null);

      // Clear file input
      const fileInput = document.getElementById('profilePicture') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      toast({
        title: 'Success',
        description: 'Profile picture uploaded successfully',
      });

      // Trigger event to refresh avatar in other components
      window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { avatarUrl: publicUrl } }));

      router.refresh();
    } catch (error: any) {
      console.error('[UPLOAD_PROFILE_PIC]', error);
      const errorMessage = error.message || 'Failed to upload profile picture';
      const isRLSError = errorMessage.includes('row-level security') || errorMessage.includes('policy');

      toast({
        title: 'Error',
        description: isRLSError
          ? 'Storage permissions not configured. Please check Supabase storage policies.'
          : errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploadingProfilePic(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!user) return;

    try {
      setUploadingProfilePic(true);
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfilePictureUrl('');

      toast({
        title: 'Success',
        description: 'Profile picture removed successfully',
      });

      router.refresh();
    } catch (error: any) {
      console.error('[REMOVE_PROFILE_PIC]', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove profile picture',
        variant: 'destructive',
      });
    } finally {
      setUploadingProfilePic(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      const data = await response.json();
      const cancelDate = data.cancelsAt
        ? new Date(data.cancelsAt * 1000).toISOString()
        : null;

      toast({
        title: 'Subscription Scheduled to Cancel',
        description: `Your subscription will remain active until ${formatDate(cancelDate)}`,
      });

      setShowCancelDialog(false);
      await refreshSubscription();
      router.refresh();
    } catch (error: any) {
      console.error('[CANCEL_SUBSCRIPTION]', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/reactivate-subscription', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reactivate subscription');
      }

      toast({
        title: 'Subscription Reactivated',
        description: 'Your subscription has been successfully reactivated',
      });

      await refreshSubscription();
      router.refresh();
    } catch (error: any) {
      console.error('[REACTIVATE_SUBSCRIPTION]', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reactivate subscription',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-4 flex-col">
      <p className="flex items-center gap-2 mt-6">
        <UserIcon size={20} /> Profile
      </p>
      <Separator />
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profilePictureUrl} />
          <AvatarFallback>
            <CypressProfileIcon />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1 gap-2">
          <p className="text-sm font-medium">{user ? user.email : ''}</p>
          <div className="flex flex-col gap-2">
            <Input
              id="profilePicture"
              name="profilePicture"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              className="hidden"
              disabled={uploadingProfilePic}
              onChange={handleFileSelect}
            />
            <Label
              htmlFor="profilePicture"
              className="inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer"
            >
              {selectedFile ? selectedFile.name.substring(0, 15) + '...' : 'Choose File'}
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="default"
                className="text-xs flex-1"
                disabled={!selectedFile || uploadingProfilePic}
                onClick={handleUploadProfilePicture}
              >
                {uploadingProfilePic ? <Loader /> : 'Upload Photo'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-xs flex-1"
                disabled={!profilePictureUrl || uploadingProfilePic}
                onClick={handleRemoveProfilePicture}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      </div>
      <p className="flex items-center gap-2 mt-6">
        <CreditCard size={20} /> Billing & Plan
      </p>
      <Separator />

      {subscription?.status === 'active' ? (
        <div className="space-y-3">
          <p className="text-sm">
            You are currently on the <span className="font-semibold text-green-600">Pro Plan</span>
          </p>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="text-sm font-medium">
                {subscription.cancelAtPeriodEnd ? (
                  <span className="text-orange-600">Inactive</span>
                ) : (
                  <span className="text-green-600">Active</span>
                )}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {subscription.cancelAtPeriodEnd ? 'Access ends' : 'Next billing date'}
              </span>
              <span className="text-sm font-medium">
                {formatDate(subscription.currentPeriodEnd)}
              </span>
            </div>
          </div>

          {subscription.cancelAtPeriodEnd && (
            <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-md flex items-center justify-between gap-3">
              <p className="text-xs text-orange-800 dark:text-orange-200">
                Your subscription will end on{' '}
                <strong>{formatDate(subscription.currentPeriodEnd)}</strong>.
              </p>
              <Button
                type="button"
                size="sm"
                variant="default"
                className="text-xs whitespace-nowrap"
                onClick={handleReactivateSubscription}
                disabled={isLoading}
              >
                {isLoading ? <Loader /> : 'Resubscribe'}
              </Button>
            </div>
          )}

          {!subscription.cancelAtPeriodEnd && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="text-sm w-full mt-2"
              onClick={() => setShowCancelDialog(true)}
            >
              Cancel Subscription
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            You are currently on the <span className="font-semibold">Free Plan</span>
          </p>
          <Button
            type="button"
            size="sm"
            variant={'secondary'}
            className="text-sm w-full"
            onClick={() => setOpen(true)}
          >
            Upgrade to Pro
          </Button>
        </div>
      )}

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Your subscription will remain active until{' '}
              <strong>{formatDate(subscription?.currentPeriodEnd ?? null)}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              After that, you'll lose access to Pro features.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isLoading}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isLoading}
            >
              {isLoading ? <Loader /> : 'Cancel Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserProfileForm;
