import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(process.env.JWT_SECRET || 'fallback_secret', 'salt', 32);
const iv = Buffer.alloc(16, 0); // For simplicity, using a fixed IV. In production, use crypto.randomBytes(16)

export const encrypt = (text) => {
  if (!text) return text;
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

export const decrypt = (encryptedText) => {
  if (!encryptedText) return encryptedText;
  try {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return encryptedText; // Fallback if decryption fails
  }
};
