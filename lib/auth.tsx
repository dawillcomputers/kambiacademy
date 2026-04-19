import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'super_admin' | 'SOU';
  status?: string;
  mustChangePassword?: boolean;
  enrolledCourses?: string[];
  country?: string;
  certificateName?: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface MeResponse {
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (name: string, email: string, password: string, role?: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => ({} as AuthUser),
  signup: async () => ({} as AuthUser),
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const isCurrentToken = (token: string | null) => localStorage.getItem('auth_token') === token;

const clearStoredTokenIfMatches = (token: string | null) => {
  if (token && isCurrentToken(token)) {
    localStorage.removeItem('auth_token');
  }
};

const authFetch = async (path: string, init?: RequestInit) => {
  const token = localStorage.getItem('auth_token');
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch (networkError) {
    throw new Error('Network error. Please check your internet connection and try again.');
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    if ((res.status === 401 || res.status === 403) && token) {
      clearStoredTokenIfMatches(token);
    }

    // Handle SW offline fallback responses
    if (res.status === 503) {
      throw new Error('Unable to connect to the server. Please check your internet connection, clear your browser cache, or try again.');
    }

    const message = data && typeof data === 'object' && 'error' in data
      ? (data as { error?: string }).error
      : res.statusText || 'Request failed';

    throw new Error(message || 'Request failed');
  }

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
      .then((data) => {
        if (isCurrentToken(token)) {
          setUser((data as MeResponse).user);
        }
      })
      .catch(() => {
        if (isCurrentToken(token)) {
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const data = await authFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }) as LoginResponse;
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string, role?: string): Promise<AuthUser> => {
    const data = await authFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    }) as LoginResponse;
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await authFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('auth_token');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    try {
      const data = await authFetch('/api/auth/me') as MeResponse;
      if (isCurrentToken(token)) {
        setUser(data.user);
      }
    } catch (error) {
      if (isCurrentToken(token)) {
        localStorage.removeItem('auth_token');
        setUser(null);
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
