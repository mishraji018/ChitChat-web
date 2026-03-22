import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/auth.js';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });
import { body, validationResult } from 'express-validator';
import { 
  checkLoginRateLimit, 
  recordFailedLogin, 
  clearFailedLogin 
} from '../middleware/rateLimiter.js';

const router = express.Router();

// Generate JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '30d' });
};

// ─── REFRESH TOKEN ───────────────────────────────────────────
router.post('/refresh-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: 'No token' });

    // Verify even if expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    
    // Check token age — only refresh if less than 60 days old
    const tokenAge = (Date.now() / 1000) - decoded.iat;
    if (tokenAge > 60 * 24 * 60 * 60) {
      return res.status(401).json({ error: 'Session too old. Please login again.', code: 'TOKEN_TOO_OLD' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.isDeleted) {
      return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    // Issue new token
    const newToken = generateToken(user._id);
    
    res.json({ success: true, token: newToken });

  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(401).json({ error: 'Failed to refresh token', code: 'REFRESH_FAILED' });
  }
});

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const otpStore = new Map(); // temporary OTP storage in memory

// ─── VALIDATION MIDDLEWARE ───────────────────────────────────
// ... existing middleware ...

// ─── SEND SIGNUP OTP ─────────────────────────────────────────
router.post('/send-signup-otp', async (req, res) => {
  try {
    const { email, mobileNumber } = req.body;

    // Check if mobile already exists
    const existingMobile = await User.findOne({ mobileNumber });
    if (existingMobile) {
      return res.status(400).json({ error: 'This mobile number is already registered' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP temporarily
    otpStore.set(email, { otp, expiry, mobileNumber });

    // Send OTP email
    await transporter.sendMail({
      from: `"BlinkChat" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'BlinkChat — Verify Your Email',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0d0a0f;color:#f0f4ff;border-radius:16px;">
          <h2 style="color:#f472b6;">BlinkChat ⚡</h2>
          <p>Welcome! Your verification OTP is:</p>
          <div style="font-size:40px;font-weight:bold;letter-spacing:10px;color:#f472b6;padding:24px;background:#1a1020;border-radius:12px;text-align:center;margin:20px 0;">
            ${otp}
          </div>
          <p style="color:#8a9bb8;">Expires in <strong>10 minutes</strong>.</p>
          <p style="color:#8a9bb8;">If you did not request this, ignore this email.</p>
        </div>
      `
    });

    res.json({ 
      success: true, 
      message: `OTP sent to ${email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}` 
    });

  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP. Check email config.' });
  }
});

// ─── VALIDATION MIDDLEWARE ───────────────────────────────────
const signupValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only have letters, numbers and underscore'),

  body('mobileNumber')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9'),

  body('email')
    .isEmail()
    .withMessage('Enter a valid email address')
    .normalizeEmail(),

  body('passkey')
    .isLength({ min: 6 })
    .withMessage('Passkey must be at least 6 characters'),

  body('confirmPasskey')
    .custom((value, { req }) => {
      if (value !== req.body.passkey) {
        throw new Error('Passkeys do not match');
      }
      return true;
    })
];

// ─── SIGNUP ──────────────────────────────────────────────────
router.post('/signup', signupValidation, async (req, res) => {
  // Check validation errors first
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: errors.array()[0].msg // return first error
    });
  }

  try {
    const { username, mobileNumber, email, passkey, otp } = req.body;

    // Verify OTP
    const stored = otpStore.get(email);
    if (!stored) {
      return res.status(400).json({ error: 'OTP not found. Please request a new one.' });
    }
    if (stored.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    if (Date.now() > stored.expiry) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    // Clear OTP after use
    otpStore.delete(email);

    // Double check duplicates (race conditions etc)
    const existingMobile = await User.findOne({ mobileNumber });
    if (existingMobile) {
      return res.status(400).json({ error: 'Mobile number already registered' });
    }

    const existingUsername = await User.findOne({ username, isDeleted: false });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const user = await User.create({
      username,
      mobileNumber,
      email,
      passkey,
      displayName: username
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        mobileNumber: user.mobileNumber,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatarColor: user.avatarColor,
        bio: user.bio
      }
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────
router.post('/login', checkLoginRateLimit, async (req, res) => {
  try {
    const { mobileNumber, passkey } = req.body;

    if (!mobileNumber || !passkey) {
      return res.status(400).json({ error: 'Mobile number and passkey are required' });
    }

    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' });
    }

    const user = await User.findOne({ mobileNumber, isDeleted: false });
    if (!user) {
      // Record failed attempt even if user not found
      recordFailedLogin(mobileNumber);
      return res.status(401).json({ error: 'No account found with this mobile number' });
    }

    const isMatch = await user.comparePasskey(passkey);
    if (!isMatch) {
      // Record failed attempt
      const result = recordFailedLogin(mobileNumber);

      if (result.blocked) {
        return res.status(429).json({
          error: `Too many failed attempts. Account locked for 30 minutes.`,
          isBlocked: true,
          blockedFor: 30
        });
      }

      return res.status(401).json({ 
        error: `Incorrect passkey. ${result.attemptsLeft} attempt${result.attemptsLeft > 1 ? 's' : ''} remaining before lockout.`,
        attemptsLeft: result.attemptsLeft
      });
    }

    // Success — clear failed attempts
    clearFailedLogin(mobileNumber);

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        mobileNumber: user.mobileNumber,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatarColor: user.avatarColor,
        bio: user.bio
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ─── FORGOT PASSKEY ──────────────────────────────────────────
router.post('/forgot-passkey', async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    const user = await User.findOne({ mobileNumber, isDeleted: false });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this mobile number' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.resetOTP = otp;
    user.resetOTPExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail({
        from: `"BlinkChat" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'BlinkChat — Reset Your Passkey',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #0d0a0f; color: #f0f4ff; border-radius: 16px;">
            <h2 style="color: #f472b6;">BlinkChat 🔐</h2>
            <p>Your OTP to reset your passkey is:</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f472b6; padding: 20px; background: #1a1020; border-radius: 12px; text-align: center; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #8a9bb8;">This OTP expires in <strong>10 minutes</strong>.</p>
            <p style="color: #8a9bb8;">If you did not request this, ignore this email.</p>
          </div>
        `
      });
    } else {
      console.log('OTP generated (no email credentials):', otp);
    }

    res.json({ 
      success: true, 
      message: `OTP sent to ${user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}` 
    });

  } catch (err) {
    console.error('Forgot passkey error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ─── VERIFY OTP ──────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;

    const user = await User.findOne({ mobileNumber, isDeleted: false });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.resetOTP || user.resetOTP !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date() > user.resetOTPExpiry) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    res.json({ success: true, message: 'OTP verified' });

  } catch (err) {
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

// ─── RESET PASSKEY ───────────────────────────────────────────
router.post('/reset-passkey', async (req, res) => {
  try {
    const { mobileNumber, otp, newPasskey, confirmPasskey } = req.body;

    if (newPasskey !== confirmPasskey) {
      return res.status(400).json({ error: 'Passkeys do not match' });
    }

    if (newPasskey.length < 6) {
      return res.status(400).json({ error: 'Passkey must be at least 6 characters' });
    }

    const user = await User.findOne({ mobileNumber, isDeleted: false });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.resetOTP !== otp || new Date() > user.resetOTPExpiry) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    user.passkey = newPasskey;
    user.resetOTP = null;
    user.resetOTPExpiry = null;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Passkey reset successfully. Your chats are safe!' 
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to reset passkey' });
  }
});

// ─── DELETE ACCOUNT ──────────────────────────────────────────
router.delete('/delete-account', async (req, res) => {
  try {
    const { userId, passkey } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await user.comparePasskey(passkey);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect passkey' });

    await mongoose.model('Message').deleteMany({
      $or: [{ senderId: userId }, { receiverId: userId }]
    });

    await mongoose.model('Conversation').deleteMany({
      participants: userId
    });

    user.isDeleted = true;
    user.username = `deleted_${user.mobileNumber}`;
    user.displayName = 'Deleted User';
    user.email = `deleted_${Date.now()}@deleted.com`;
    user.avatarUrl = '';
    user.bio = '';
    await user.save();

    res.json({ 
      success: true, 
      message: 'Account deleted. This mobile number cannot be used again.' 
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ─── UPDATE AVATAR ──────────────────────────────────────────
router.post('/update-avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.avatarUrl = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({ success: true, avatarUrl: user.avatarUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// ─── UPDATE FCM TOKEN ───────────────────────────────────────
router.post('/update-fcm-token', async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;
    await User.findByIdAndUpdate(userId, { fcmToken });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update FCM token' });
  }
});

// ─── LOGOUT ──────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(userId, { 
      isOnline: false, 
      lastSeen: new Date() 
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
