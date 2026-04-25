import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateOTP } from '../utils/otp.utils.js';
import { sendOTPEmail } from '../utils/email.utils.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '90d' });
};

export const signup = async (req, res) => {
  const { name, mobile, email, passkey } = req.body;

  try {
    const userExists = await User.findOne({ 
      $or: [{ mobile }, { email }] 
    });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this mobile or email' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const user = await User.create({
      name,
      mobile,
      email,
      passkey, // Will be hashed by pre-save middleware
      otp,
      otpExpiry,
    });

    const emailSent = await sendOTPEmail(email, otp);

    if (emailSent) {
      res.status(201).json({
        success: true,
        message: 'Signup successful. Please verify your email with the OTP sent.',
        data: { email: user.email }
      });
    } else {
      res.status(500).json({ success: false, message: 'Error sending OTP email' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        token,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  const { mobile, passkey } = req.body;

  try {
    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid mobile or passkey' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Please verify your email first' });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(423).json({ success: false, message: 'Account locked. Try again later.' });
    }

    const isMatch = await user.comparePasskey(passkey);

    if (isMatch) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      user.isOnline = true;
      user.lastSeen = Date.now();
      
      const token = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      user.refreshToken = refreshToken;
      
      await user.save();

      res.status(200).json({
        success: true,
        data: {
          token,
          refreshToken,
          user: {
            id: user._id,
            name: user.name,
            mobile: user.mobile,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
          }
        }
      });
    } else {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 mins
      }
      await user.save();
      res.status(401).json({ success: false, message: 'Invalid mobile or passkey' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.isOnline = false;
      user.lastSeen = Date.now();
      user.refreshToken = undefined;
      await user.save();
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const emailSent = await sendOTPEmail(email, otp);

    if (emailSent) {
      res.status(200).json({ success: true, message: 'OTP resent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Error sending OTP email' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const forgotPasskey = async (req, res) => {
  const { mobile } = req.body;

  try {
    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOTPEmail(user.email, otp);

    // Mask email for security
    const maskedEmail = user.email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => { 
        return gp2 + "*".repeat(gp3.length);
    });

    res.status(200).json({ 
        success: true, 
        message: 'OTP sent to your registered email', 
        data: { email: maskedEmail, originalEmail: user.email } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPasskey = async (req, res) => {
  const { email, otp, newPasskey } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.passkey = newPasskey; // Will be hashed by pre-save middleware
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Passkey reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const newToken = generateToken(user._id);
    res.status(200).json({ success: true, data: { token: newToken } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    // Delete user from Database would typically go here along with associated messages and conversations.
    // To be implemented as specified.
    await User.findByIdAndDelete(req.user.id);
    // Add logic to delete messages and conversations later.
    res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
