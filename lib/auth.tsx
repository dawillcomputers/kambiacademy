import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const authFetch = async (path: string, init?: RequestInit) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    authFetch('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem('auth_token'))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const data = await authFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await authFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('auth_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
