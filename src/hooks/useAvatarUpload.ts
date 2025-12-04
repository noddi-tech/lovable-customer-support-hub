import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UseAvatarUploadOptions {
  userId: string;
  onSuccess?: (url: string) => void;
}

export const useAvatarUpload = ({ userId, onSuccess }: UseAvatarUploadOptions) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();

  const uploadAvatar = async (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, or WebP.');
      return null;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 2MB.');
      return null;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      // Delete existing avatar if any
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(userId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToDelete);
      }

      setProgress(30);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      setProgress(70);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setProgress(100);

      // Invalidate profile query
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });

      toast.success('Avatar updated successfully');
      onSuccess?.(publicUrl);

      return publicUrl;
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload avatar');
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const removeAvatar = async () => {
    setIsUploading(true);

    try {
      // List and delete all files in user's avatar folder
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(userId);

      if (files && files.length > 0) {
        const filesToDelete = files.map(f => `${userId}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToDelete);
      }

      // Update profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Invalidate profile query
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });

      toast.success('Avatar removed');
    } catch (error) {
      console.error('Avatar removal error:', error);
      toast.error('Failed to remove avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadAvatar,
    removeAvatar,
    isUploading,
    progress,
  };
};
