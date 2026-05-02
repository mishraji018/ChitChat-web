import { useState } from 'react';
import { supabase } from '@/config/supabase';

interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
}

export const compressImage = async (file: File): Promise<File> => {
  // Only compress images
  if (!file.type.startsWith('image/')) return file;
  
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Max dimensions like WhatsApp: 1280px
      const maxSize = 1280;
      let { width, height } = img;
      
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Compress to 0.7 quality JPEG
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        resolve(compressed);
      }, 'image/jpeg', 0.7);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

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
    // Compress before uploading
    const fileToUpload = await compressImage(file);
    
    const fileId = crypto.randomUUID();
    const ext = fileToUpload.name.split('.').pop();
    const path = `${chatId}/${fileId}.${ext}`;

    setUploads(prev => [...prev, { 
      fileId, progress: 0, status: 'uploading' 
    }]);

    try {
      // Supabase storage upload
      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(path, fileToUpload, {
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
        type: getFileCategory(fileToUpload),
        size: fileToUpload.size,
        name: fileToUpload.name
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
