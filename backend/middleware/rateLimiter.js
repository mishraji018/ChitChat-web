import rateLimit from 'express-rate-limit';

// ── LOGIN RATE LIMITER ────────────────────────────────────────
// Max 5 attempts per mobile number per 30 minutes
const loginAttempts = new Map(); // { mobileNumber -> { count, blockedUntil } }

export const checkLoginRateLimit = (req, res, next) => {
  const { mobileNumber } = req.body;
  if (!mobileNumber) return next();

  const now = Date.now();
  const record = loginAttempts.get(mobileNumber);

  if (record) {
    // Check if still blocked
    if (record.blockedUntil && now < record.blockedUntil) {
      const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
      return res.status(429).json({
        error: `Too many failed attempts. Try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
        blockedFor: remainingMinutes,
        isBlocked: true
      });
    }

    // Reset if block time has passed
    if (record.blockedUntil && now >= record.blockedUntil) {
      loginAttempts.delete(mobileNumber);
    }
  }

  next();
};

export const recordFailedLogin = (mobileNumber) => {
  const now = Date.now();
  const record = loginAttempts.get(mobileNumber) || { count: 0 };
  record.count += 1;

  if (record.count >= 5) {
    record.blockedUntil = now + 30 * 60 * 1000; // block 30 minutes
    record.count = 0; // reset count after blocking
    loginAttempts.set(mobileNumber, record);
    return { blocked: true, minutes: 30 };
  }

  loginAttempts.set(mobileNumber, record);
  return { blocked: false, attemptsLeft: 5 - record.count };
};

export const clearFailedLogin = (mobileNumber) => {
  loginAttempts.delete(mobileNumber);
};

// ── GLOBAL API RATE LIMITER ───────────────────────────────────
// Max 100 requests per IP per 15 minutes
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── SIGNUP RATE LIMITER ───────────────────────────────────────
// Max 3 signups per IP per hour
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many signup attempts. Try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── OTP RATE LIMITER ──────────────────────────────────────────
// Max 3 OTP requests per email per 10 minutes
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: { error: 'Too many OTP requests. Wait 10 minutes.' },
  keyGenerator: (req) => req.body.email || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});
