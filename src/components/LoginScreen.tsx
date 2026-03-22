import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Eye, EyeOff, Phone, Mail, User, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signupUser, loginUser, sendForgotOTP, verifyOTP, resetPasskey, saveSession } from '@/services/authService';
import { toast } from 'sonner';

const AVATAR_COLORS = ['#00d4a0', '#4f8ef7', '#f472b6', '#facc15', '#a78bfa', '#fb923c'];

interface LoginScreenProps {
  onLogin: (user: any) => void;
  t?: any;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [isSignup, setIsSignup] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileError, setMobileError] = useState('');

  // Signup fields
  const [username, setUsername] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [passkey, setPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[2]); // Pink by default
  const [signupStep, setSignupStep] = useState(1); // 1 = form, 2 = otp
  const [otp, setOtp] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Login Rate Limit states
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedMinutes, setBlockedMinutes] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [blockTimer, setBlockTimer] = useState(0);

  // Login fields
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPasskey, setLoginPasskey] = useState('');

  // Forgot Passkey state
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotMobile, setForgotMobile] = useState('');
  const [newPasskey, setNewPasskey] = useState('');
  const [confirmNewPasskey, setConfirmNewPasskey] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  const validateSignup = () => {
    // Username check (3-30 chars, alphanumeric + underscore)
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only have letters, numbers and underscore');
      return false;
    }

    // Mobile number validation
    const mobile = mobileNumber.trim();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9');
      return false;
    }

    // Block obviously fake numbers
    const invalidNumbers = [
      '6000000000', '7000000000', '8000000000', '9000000000',
      '9999999999', '8888888888', '7777777777', '6666666666',
      '1234567890', '0000000000'
    ];
    if (invalidNumbers.includes(mobile)) {
      setError('Please enter a real mobile number');
      return false;
    }

    // Email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address');
      return false;
    }

    // Passkey check
    if (passkey.length < 6) {
      setError('Passkey must be at least 6 characters');
      return false;
    }
    if (passkey !== confirmPasskey) {
      setError('Passkeys do not match');
      return false;
    }

    return true;
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // numbers only
    setMobileNumber(val);

    if (val.length === 0) {
      setMobileError('');
    } else if (!/^[6-9]/.test(val)) {
      setMobileError('❌ Must start with 6, 7, 8 or 9');
    } else if (val.length < 10) {
      setMobileError(`${10 - val.length} more digits needed`);
    } else if (val.length === 10) {
      setMobileError('✅ Valid number format');
    }
  };

  // Start resend countdown
  const startResendTimer = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    if (!validateSignup()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/send-signup-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mobileNumber })
      });
      const data = await res.json();
      if (data.success) {
        setOtpMessage(data.message);
        setSignupStep(2);
        startResendTimer();
        toast.success(data.message);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Connection failed. Is backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    
    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const data = await signupUser({ 
        username, 
        mobileNumber, 
        email, 
        passkey, 
        confirmPasskey,
        otp 
      });
      if (data.success) {
        saveSession(data.token, data.user);
        toast.success('Account created! 🎉 Welcome to BlinkChat');
        onLogin(data.user);
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('Connection failed. Is backend running?');
    } finally {
      setLoading(false);
    }
  };

  // Start countdown timer when blocked
  const startBlockTimer = (minutes: number) => {
    let seconds = minutes * 60;
    setBlockTimer(seconds);
    const interval = setInterval(() => {
      seconds -= 1;
      setBlockTimer(seconds);
      if (seconds <= 0) {
        clearInterval(interval);
        setIsBlocked(false);
        setBlockTimer(0);
        setAttemptsLeft(5);
      }
    }, 1000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;
    setError(null);
    if (!loginMobile || !loginPasskey) {
      setError('Mobile number and passkey are required');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(loginMobile)) {
      setError('Enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser(loginMobile, loginPasskey);
      if (data.success) {
        saveSession(data.token, data.user);
        toast.success(`Welcome back, ${data.user.displayName}!`);
        onLogin(data.user);
      } else if (data.isBlocked) {
        setIsBlocked(true);
        setBlockedMinutes(data.blockedFor);
        startBlockTimer(data.blockedFor);
        setError(null);
      } else {
        if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft);
        }
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection failed. Is backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleBypass = () => {
    const mockUser = {
      id: 'mock-123',
      username: 'Guest',
      displayName: 'Guest User',
      mobileNumber: '9999999999',
      avatarUrl: '',
      avatarColor: '#f472b6',
      bio: 'Auditing BlinkChat',
      isOnline: true,
      lastSeen: new Date().toISOString()
    };
    onLogin(mockUser);
  };

  const handleForgotOTP = async () => {
    if (!forgotMobile) {
      toast.error('Please enter your mobile number');
      return;
    }
    setLoading(true);
    try {
      const data = await sendForgotOTP(forgotMobile);
      if (data.success) {
        setMaskedEmail(data.message);
        setForgotStep(2);
        toast.success('OTP sent to your email');
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const data = await verifyOTP(forgotMobile, otp);
      if (data.success) {
        setForgotStep(3);
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasskey = async () => {
    if (newPasskey !== confirmNewPasskey) {
      toast.error('Passkeys do not match');
      return;
    }
    if (newPasskey.length < 6) {
      toast.error('Passkey must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const data = await resetPasskey({ 
        mobileNumber: forgotMobile, 
        otp, 
        newPasskey, 
        confirmPasskey: confirmNewPasskey 
      });
      if (data.success) {
        toast.success('Passkey reset! You can now login.');
        setShowForgot(false);
        setForgotStep(1);
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Failed to reset passkey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-background overflow-hidden px-4"
    >
      {/* Background decoration remains same */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(hsl(var(--muted-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--muted-foreground)) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full gradient-primary opacity-[0.15] blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-primary opacity-[0.1] blur-[80px]" />
      </div>

      <motion.div
        layout
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-md p-8 rounded-3xl bg-card/80 backdrop-blur-2xl border border-border/50 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <AnimatePresence mode="wait">
          {!showForgot ? (
            <motion.div
              key="auth-forms"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Zap className="w-6 h-6 text-primary-foreground" fill="currentColor" />
                </div>
                <span className="font-display text-xl font-bold tracking-tight">BlinkChat</span>
              </div>

              <h2 className="text-2xl font-bold text-center mb-1">
                {isSignup ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-center text-muted-foreground text-sm mb-6">
                {isSignup ? 'Secure your communications today' : 'Enter your credentials to continue'}
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center font-medium animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              <form onSubmit={isSignup ? (e) => { e.preventDefault(); signupStep === 1 ? handleSendOTP() : handleSignup(); } : handleLogin} className="space-y-4">
                {isSignup ? (
                  signupStep === 1 ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="pl-10 h-12 rounded-xl" />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center justify-center px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-medium">+91</div>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input 
                            placeholder="10-digit Mobile" 
                            maxLength={10} 
                            value={mobileNumber} 
                            onChange={handleMobileChange} 
                            className={`pl-10 h-12 rounded-xl transition-colors ${
                              mobileError.startsWith('✅') ? 'border-green-500/50' : 
                              mobileError.startsWith('❌') ? 'border-red-500/50' : ''
                            }`} 
                          />
                          {mobileError && (
                            <p className={`text-[10px] mt-1 absolute -bottom-4 left-0 font-medium ${
                              mobileError.startsWith('✅') ? 'text-green-500' : 'text-red-400'
                            }`}>
                              {mobileError}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input placeholder="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-12 rounded-xl" />
                      </div>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input placeholder="Passkey (Secret Word)" type={showPass ? 'text' : 'password'} value={passkey} onChange={e => setPasskey(e.target.value)} className="pl-10 h-12 pr-12 rounded-xl" />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <Input placeholder="Confirm Passkey" type="password" value={confirmPasskey} onChange={e => setConfirmPasskey(e.target.value)} className="h-12 rounded-xl" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center py-2">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                          <Mail size={28} className="text-primary" />
                        </div>
                        <h3 className="font-bold text-lg">Check Your Email</h3>
                        <p className="text-[11px] text-muted-foreground mt-1">{otpMessage}</p>
                      </div>

                      {/* OTP inputs */}
                      <div className="flex gap-2 justify-center py-2">
                        {[0,1,2,3,4,5].map(i => (
                          <input
                            key={i}
                            id={`signup-otp-${i}`}
                            type="tel"
                            maxLength={1}
                            value={otp[i] || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              const newOtp = otp.split('');
                              newOtp[i] = val;
                              setOtp(newOtp.join(''));
                              if (val && i < 5) {
                                document.getElementById(`signup-otp-${i+1}`)?.focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !otp[i] && i > 0) {
                                document.getElementById(`signup-otp-${i-1}`)?.focus();
                              }
                            }}
                            className="w-10 h-12 text-center text-xl font-bold bg-muted border-2 border-border rounded-xl focus:border-primary focus:outline-none transition-colors"
                          />
                        ))}
                      </div>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => { if(resendTimer === 0) handleSendOTP(); }}
                          disabled={resendTimer > 0}
                          className="text-xs text-primary disabled:opacity-50 font-medium"
                        >
                          {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => { setSignupStep(1); setOtp(''); setError(''); }}
                        className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
                      >
                        ← Change Details
                      </button>
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    {isBlocked ? (
                      <div className="text-center py-6 px-4 bg-destructive/10 border border-destructive/30 rounded-xl animate-in zoom-in-95 duration-300">
                        <div className="text-4xl mb-3">🔒</div>
                        <h3 className="font-bold text-destructive text-lg">Account Temporarily Locked</h3>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Too many failed attempts. Try again in:
                        </p>
                        <div className="text-3xl font-bold text-destructive mt-3 font-mono tracking-wider bg-destructive/10 py-2 rounded-lg">
                          {Math.floor(blockTimer / 60)}:{String(blockTimer % 60).padStart(2, '0')}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
                          Forgot your passkey? Use the <button type="button" onClick={() => setShowForgot(true)} className="text-primary hover:underline">Forgot Passkey</button> option below.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <div className="flex items-center justify-center px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-medium">+91</div>
                          <div className="relative flex-1">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input 
                              placeholder="Mobile Number" 
                              maxLength={10} 
                              value={loginMobile} 
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setLoginMobile(val);
                              }} 
                              className="pl-10 h-12 rounded-xl" 
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input placeholder="Passkey" type={showPass ? 'text' : 'password'} value={loginPasskey} onChange={e => setLoginPasskey(e.target.value)} className="pl-10 h-12 pr-12 rounded-xl" />
                          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        
                        {attemptsLeft < 5 && attemptsLeft > 0 && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl animate-in slide-in-from-top-2">
                            <span className="text-yellow-500 text-xs">⚠️</span>
                            <p className="text-[10px] text-yellow-500 font-medium">
                              {attemptsLeft} attempt{attemptsLeft > 1 ? 's' : ''} remaining before lockout
                            </p>
                          </div>
                        )}
                        
                        <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-primary hover:underline block ml-auto">Forgot Passkey?</button>
                      </>
                    )}
                  </div>
                )}

                <Button type="submit" disabled={loading || (isSignup ? false : isBlocked)} className="w-full h-12 rounded-xl gradient-primary text-white font-bold text-base shadow-lg shadow-primary/20 mt-2 disabled:opacity-50">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    isSignup ? (signupStep === 1 ? 'Send OTP' : 'Verify & Create Account') : (isBlocked ? '🔒 Locked' : 'Sign In')
                  )}
                </Button>

                <button
                  type="button"
                  onClick={handleBypass}
                  className="w-full mt-4 py-2 text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest font-bold border border-dashed border-border/50 rounded-lg"
                >
                  Bypass Login (Dev Audit Only)
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {isSignup ? "Already on BlinkChat?" : "New to BlinkChat?"}{' '}
                <button onClick={() => setIsSignup(!isSignup)} className="text-primary hover:underline font-bold">
                  {isSignup ? 'Sign In' : 'Join Now'}
                </button>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="forgot-passkey"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button 
                onClick={() => { setShowForgot(false); setForgotStep(1); }}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
              >
                <ArrowLeft size={16} /> Back to Login
              </button>

              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Recover Access</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {forgotStep === 1 ? 'Verify your identity to reset passkey' : forgotStep === 2 ? 'We sent security code' : 'Choose a strong new passkey'}
                </p>
              </div>

              {forgotStep === 1 && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-medium">+91</div>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input 
                        placeholder="Registered Mobile" 
                        maxLength={10} 
                        value={forgotMobile} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setForgotMobile(val);
                        }} 
                        className="pl-10 h-12 rounded-xl" 
                      />
                    </div>
                  </div>
                  <Button onClick={handleForgotOTP} disabled={loading} className="w-full h-12 bg-primary rounded-xl text-white font-bold">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP to Email'}
                  </Button>
                </div>
              )}

              {forgotStep === 2 && (
                <div className="space-y-4">
                  <div className="text-center py-2 px-3 bg-muted/30 rounded-lg border border-border group">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tight">Security code sent to</p>
                    <p className="text-sm font-medium">{maskedEmail.split('sent to ')[1] || 'your email'}</p>
                  </div>
                  <Input 
                    placeholder="Enter 6-digit OTP" 
                    maxLength={6} 
                    value={otp} 
                    onChange={e => setOtp(e.target.value)} 
                    className="h-14 text-center text-2xl font-bold tracking-[0.5em] rounded-xl"
                  />
                  <Button onClick={handleVerifyOTP} disabled={loading} className="w-full h-12 bg-primary rounded-xl text-white font-bold">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
                  </Button>
                  <button onClick={handleForgotOTP} className="w-full text-xs text-muted-foreground hover:text-primary">Didn't get code? Resend</button>
                </div>
              )}

              {forgotStep === 3 && (
                <div className="space-y-4">
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input placeholder="Enter New Passkey" type={showPass ? 'text' : 'password'} value={newPasskey} onChange={e => setNewPasskey(e.target.value)} className="pl-10 h-12 rounded-xl" />
                  </div>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input placeholder="Confirm New Passkey" type="password" value={confirmNewPasskey} onChange={e => setConfirmNewPasskey(e.target.value)} className="pl-10 h-12 rounded-xl" />
                  </div>
                  <Button onClick={handleResetPasskey} disabled={loading} className="w-full h-12 gradient-primary rounded-xl text-white font-bold">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Passkey'}
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default LoginScreen;

