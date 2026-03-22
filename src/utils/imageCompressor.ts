import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<File> => {
  // Skip if already small
  if (file.size < 500 * 1024) return file; // less than 500KB — skip

  const options = {
    maxSizeMB: 1,           // max 1MB
    maxWidthOrHeight: 1280, // max 1280px
    useWebWorker: true,
    onProgress: (progress: number) => {
      console.log(`Compressing: ${progress}%`);
    }
  };

  try {
    const compressed = await imageCompression(file, options);
    console.log(`Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressed.size / 1024 / 1024).toFixed(2)}MB`);
    return compressed as File;
  } catch (error) {
    console.error('Compression failed:', error);
    return file; // return original if compression fails
  }
};

// Generate thumbnail for videos
export const generateVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.currentTime = 1;
    };

    video.onseeked = () => {
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      URL.revokeObjectURL(url);
      resolve(thumbnail);
    };

    video.src = url;
  });
};
