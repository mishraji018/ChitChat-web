import express from 'express';
import { uploadMedia, deleteMedia } from '../controllers/media.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/upload', upload.single('file'), uploadMedia);
router.delete('/delete/:publicId', deleteMedia);

export default router;
