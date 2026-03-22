import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

// Use memory storage for Multer to allow buffer inspection with magic bytes
const storage = multer.memoryStorage();
export const upload = multer({ 
  storage,
  limits: {
    // A generous limit that covers the max of all allowed video payloads (64MB)
    fileSize: 64 * 1024 * 1024, 
  }
});

export { cloudinary };
