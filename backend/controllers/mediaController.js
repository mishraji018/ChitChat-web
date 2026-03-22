import { v2 as cloudinary } from 'cloudinary';
import { fileTypeFromBuffer } from 'file-type';
import { getLinkPreview as fetchLinkPreview } from 'link-preview-js';

const FORBIDDEN_EXTS = ['exe', 'sh', 'bat', 'js', 'php'];

const validateMimeType = async (buffer, expectedCategory) => {
  const type = await fileTypeFromBuffer(buffer);
  
  if (!type) {
    // If it's a typical text document like txt, file-type might not detect it.
    // For safety, we enforce detection for most media.
    if (expectedCategory === 'document') return { isValid: true, ext: 'txt' };
    return { isValid: false, error: 'Could not determine file type from magic bytes' };
  }

  if (FORBIDDEN_EXTS.includes(type.ext)) {
    return { isValid: false, error: 'Executable scripts and binaries are forbidden' };
  }

  const mime = type.mime;
  let isValid = false;

  switch (expectedCategory) {
    case 'image':
      isValid = mime.startsWith('image/');
      break;
    case 'video':
      isValid = mime.startsWith('video/');
      break;
    case 'voice':
      isValid = mime.startsWith('audio/') || mime.startsWith('video/webm');
      break;
    case 'document':
      isValid = mime.startsWith('application/') || mime.startsWith('text/');
      break;
  }

  if (!isValid) return { isValid: false, error: `Invalid magic bytes for expected category ${expectedCategory}` };
  return { isValid: true, ext: type.ext };
};

const sanitizeFileName = (reqFile) => {
  return reqFile.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
};

const uploadToCloudinary = (buffer, folder, resourceType) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

const formatSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    if (req.file.size > 10 * 1024 * 1024) return res.status(400).json({ error: 'Max 10MB allowed' });

    const val = await validateMimeType(req.file.buffer, 'image');
    if (!val.isValid) return res.status(400).json({ error: val.error });

    const result = await uploadToCloudinary(req.file.buffer, 'blinkchat/images', 'image');
    
    res.status(200).json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      size: formatSize(result.bytes)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const uploadVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file provided' });
    if (req.file.size > 64 * 1024 * 1024) return res.status(400).json({ error: 'Max 64MB allowed' });

    const val = await validateMimeType(req.file.buffer, 'video');
    if (!val.isValid) return res.status(400).json({ error: val.error });

    const result = await uploadToCloudinary(req.file.buffer, 'blinkchat/videos', 'video');
    
    res.status(200).json({
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration ? `${Math.round(result.duration)}s` : 'Unknown',
      size: formatSize(result.bytes),
      thumbnail: result.secure_url.replace(/\.[^/.]+$/, '.jpg') // standard Cloudinary thumb trick
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No document file provided' });
    if (req.file.size > 20 * 1024 * 1024) return res.status(400).json({ error: 'Max 20MB allowed' });

    const val = await validateMimeType(req.file.buffer, 'document');
    if (!val.isValid) return res.status(400).json({ error: val.error });

    const cleanName = sanitizeFileName(req.file);
    const result = await uploadToCloudinary(req.file.buffer, 'blinkchat/documents', 'raw');
    
    res.status(200).json({
      url: result.secure_url,
      publicId: result.public_id,
      fileName: cleanName,
      fileSize: formatSize(result.bytes),
      fileType: val.ext || 'doc'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const uploadVoice = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No voice file provided' });
    if (req.file.size > 10 * 1024 * 1024) return res.status(400).json({ error: 'Max 10MB allowed' });

    const val = await validateMimeType(req.file.buffer, 'voice');
    if (!val.isValid) return res.status(400).json({ error: val.error });

    const result = await uploadToCloudinary(req.file.buffer, 'blinkchat/voice', 'video'); // Cloudinary processes audio as video resource type sometimes, or 'auto'
    
    res.status(200).json({
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration ? `${Math.round(result.duration)}s` : 'Unknown',
      size: formatSize(result.bytes)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const uploadMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files provided' });
    if (req.files.length > 10) return res.status(400).json({ error: 'Max 10 images allowed' });

    const uploadedFiles = [];
    
    for (const file of req.files) {
      const val = await validateMimeType(file.buffer, 'image');
      if (!val.isValid) continue;

      const result = await uploadToCloudinary(file.buffer, 'blinkchat/images', 'image');
      uploadedFiles.push({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        size: formatSize(result.bytes)
      });
    }

    res.status(200).json(uploadedFiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteMedia = async (req, res) => {
  try {
    const { publicId } = req.params;
    // publicId might come uri encoded if it contains slashes, normally express decodes it or we pass it via body. Let's decode to be safe.
    const decodedId = decodeURIComponent(publicId);
    
    await cloudinary.uploader.destroy(decodedId);
    res.status(200).json({ message: 'Media deleted from Cloudinary' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getLinkPreview = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    const data = await fetchLinkPreview(url);

    res.status(200).json({
      url: data.url,
      title: data.title || '',
      description: data.description || '',
      image: data.images && data.images.length > 0 ? data.images[0] : '',
      siteName: data.siteName || ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch link preview', details: err.message });
  }
};

export const shareLocation = async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: 'Latitude and Longitude required' });

    const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=300x200&markers=${latitude},${longitude}`;

    res.status(200).json({
      url: mapUrl,
      latitude,
      longitude,
      address: address || ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
