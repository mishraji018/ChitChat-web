import express from 'express';
import rateLimit from 'express-rate-limit';
import { upload } from '../config/cloudinary.js';
import {
  uploadImage,
  uploadVideo,
  uploadDocument,
  uploadVoice,
  uploadMultiple,
  deleteMedia,
  getLinkPreview,
  shareLocation
} from '../controllers/mediaController.js';

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP/User to 20 windowed requests per minute
  message: { error: 'Too many uploads from this IP, please try again after a minute' }
});

router.use(uploadLimiter);

router.post('/upload/image', upload.single('file'), uploadImage);
router.post('/upload/video', upload.single('file'), uploadVideo);
router.post('/upload/document', upload.single('file'), uploadDocument);
router.post('/upload/voice', upload.single('file'), uploadVoice);
router.post('/upload/multiple', upload.array('files', 10), uploadMultiple);

// Note: Ensure the client URL-encodes the publicId since it contains slashes (e.g. blinkchat/images/foo)
router.delete('/delete/:publicId', deleteMedia);

router.post('/link-preview', getLinkPreview);
router.post('/location', shareLocation);

export default router;
