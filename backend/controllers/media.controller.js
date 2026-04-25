import { cloudinary } from '../config/cloudinary.js';

export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    res.status(200).json({
      success: true,
      data: {
        url: req.file.path,
        publicId: req.file.filename,
        size: req.file.size,
        type: req.file.mimetype.split('/')[0]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMedia = async (req, res) => {
  const { publicId } = req.params;

  try {
    await cloudinary.uploader.destroy(publicId);
    res.status(200).json({ success: true, message: 'Media deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
