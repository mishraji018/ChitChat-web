const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const getToken = () => localStorage.getItem('blinkchat_token');
export const setToken = (token: string) => localStorage.setItem('blinkchat_token', token);
export const clearToken = () => localStorage.removeItem('blinkchat_token');

const clearSession = () => {
  localStorage.removeItem('blinkchat_token');
  localStorage.removeItem('blinkchat_user');
};

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

// Auto refresh token
export const refreshToken = async (): Promise<string | null> => {
  try {
    const token = getToken();
    if (!token) return null;

    const res = await fetch(`${API_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    const data = await res.json();
    if (data.success) {
      setToken(data.token);
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
};

// API call with auto token refresh
export const apiFetch = async (url: string, options: RequestInit = {}) => {
  let token = getToken();

  // Refresh if expired
  if (token && isTokenExpired(token)) {
    const newToken = await refreshToken();
    if (!newToken) {
      // Force logout
      clearSession();
      window.location.reload();
      return null;
    }
    token = newToken;
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });

  // Handle 401 globally
  if (response.status === 401) {
    const data = await response.json();
    if (data.code && ['TOKEN_EXPIRED', 'INVALID_TOKEN', 'TOKEN_TOO_OLD'].includes(data.code)) {
      clearSession();
      window.location.reload();
      return null;
    }
  }

  return response;
};
