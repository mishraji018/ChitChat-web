import { supabase } from '@/config/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const syncGoogleAuth = async (accessToken: string) => {
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken })
  });
  return res.json();
};

export const completeGoogleSignup = async (userData: {
  userId: string;
  email: string;
  username: string;
  avatar_url: string;
}) => {
  const res = await fetch(`${API_URL}/api/auth/complete-google-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return res.json();
};

export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Supabase SignOut Error:', error);
  
  const token = localStorage.getItem('blinkchat_token');
  if (token) {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  }
  clearSession();
};

export const saveSession = (token: string, user: any) => {
  localStorage.setItem('blinkchat_token', token);
  localStorage.setItem('blinkchat_user', JSON.stringify({ ...user, isLoggedIn: true }));
};

export const getSavedUser = () => {
  try {
    const user = localStorage.getItem('blinkchat_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem('blinkchat_token');
  localStorage.removeItem('blinkchat_user');
};
