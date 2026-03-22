import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';
dotenv.config();

const SECRET_KEY = process.env.ENCRYPTION_KEY || 'blinkchat_enc_key_2024';

// Encrypt message content
export const encrypt = (text) => {
  if (!text) return text;
  try {
    return CryptoJS.AES.encrypt(text.toString(), SECRET_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return text;
  }
};

// Decrypt message content
export const decrypt = (cipherText) => {
  if (!cipherText) return cipherText;
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText; // fallback to original if decrypt fails
  } catch (error) {
    console.error('Decryption error:', error);
    return cipherText;
  }
};
