import { useState } from 'react';
import { supabase } from '@/config/supabase';

interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
}

export const useFileUpload = () => {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  const getFileCategory = (file: File) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'file';
  };

  const uploadFile = async (
    file: File,
    chatId: string,
    senderId: string,
    onProgress?: (percent: number) => void
  ) => {
    const fileId = crypto.randomUUID();
    const ext = file.name.split('.').pop();
    const path = `${chatId}/${fileId}.${ext}`;

    setUploads(prev => [...prev, { 
      fileId, progress: 0, status: 'uploading' 
    }]);

    try {
      // Supabase storage upload
      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(path);

      setUploads(prev => prev.map(u =>
        u.fileId === fileId 
          ? { ...u, progress: 100, status: 'done' } 
          : u
      ));

      return {
        url: urlData.publicUrl,
        type: getFileCategory(file),
        size: file.size,
        name: file.name
      };

    } catch (err) {
      console.error('Upload error:', err);
      setUploads(prev => prev.map(u =>
        u.fileId === fileId 
          ? { ...u, status: 'error' } 
          : u
      ));
      throw err;
    }
  };

  const clearUpload = (fileId: string) => {
    setUploads(prev => prev.filter(u => u.fileId !== fileId));
  };

  return { uploadFile, uploads, clearUpload, getFileCategory };
};
