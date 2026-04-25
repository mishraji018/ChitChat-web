import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passkey: { type: String, required: true },
  avatar: { type: String, default: "" },
  bio: { type: String, default: "Hey there! I am using ChitChat" },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  fcmToken: { type: String },
  refreshToken: { type: String }
}, { timestamps: true });

// Hash passkey before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passkey')) return next();
  this.passkey = await bcrypt.hash(this.passkey, 12);
  next();
});

// Method to compare passkey
userSchema.methods.comparePasskey = async function(candidatePasskey) {
  return await bcrypt.compare(candidatePasskey, this.passkey);
};

const User = mongoose.model('User', userSchema);
export default User;
