const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Signup
export const signupUser = async (data: any) => {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

// Login
export const loginUser = async (mobileNumber: string, passkey: string) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber, passkey })
  });
  return res.json();
};

// Forgot Passkey
export const sendForgotOTP = async (mobileNumber: string) => {
  const res = await fetch(`${API_URL}/auth/forgot-passkey`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber })
  });
  return res.json();
};

// Verify OTP
export const verifyOTP = async (mobileNumber: string, otp: string) => {
  const res = await fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber, otp })
  });
  return res.json();
};

// Reset Passkey
export const resetPasskey = async (data: any) => {
  const res = await fetch(`${API_URL}/auth/reset-passkey`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

// Delete Account
export const deleteAccount = async (userId: string, passkey: string) => {
  const res = await fetch(`${API_URL}/auth/delete-account`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, passkey })
  });
  return res.json();
};

// Logout
export const logoutUser = async (userId: string) => {
  const res = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  return res.json();
};

// Save session to localStorage
export const saveSession = (token: string, user: any) => {
  localStorage.setItem('blinkchat_token', token);
  localStorage.setItem('blinkchat_user', JSON.stringify({ ...user, isLoggedIn: true }));
};

// Get saved user
export const getSavedUser = () => {
  try {
    const user = localStorage.getItem('blinkchat_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

// Clear session
export const clearSession = () => {
  localStorage.removeItem('blinkchat_token');
  localStorage.removeItem('blinkchat_user');
};
