import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Profile Info
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,        // ONE account per mobile number
    trim: true,
    validate: {
      validator: function(v) {
        // Valid Indian mobile: starts with 6,7,8,9 — exactly 10 digits
        return /^[6-9]\d{9}$/.test(v);
      },
      message: 'Please enter a valid Indian mobile number'
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passkey: {
    type: String,
    required: true       // hashed keyword/passkey
  },

  // Profile Data
  displayName: {
    type: String,
    default: function() { return this.username; }
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  avatarColor: {
    type: String,
    default: '#f472b6'
  },
  bio: {
    type: String,
    default: 'Hey there! I am using BlinkChat',
    maxlength: 100
  },

  // Status
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  fcmToken: { type: String, default: null },
  isDeleted: { type: Boolean, default: false },  // soft delete

  // Privacy
  privacy: {
    lastSeen: { type: String, enum: ['everyone', 'nobody'], default: 'everyone' },
    profilePhoto: { type: String, enum: ['everyone', 'nobody'], default: 'everyone' },
    readReceipts: { type: Boolean, default: true }
  },

  // Forgot passkey OTP
  resetOTP: { type: String, default: null },
  resetOTPExpiry: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now }
});

// Hash passkey before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passkey')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.passkey = await bcrypt.hash(this.passkey, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare passkey
userSchema.methods.comparePasskey = async function(enteredPasskey) {
  return await bcrypt.compare(enteredPasskey, this.passkey);
};

export const User = mongoose.model('User', userSchema);
