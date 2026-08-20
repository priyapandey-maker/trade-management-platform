'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/axios';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'CLIENT';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('shree_token');
      const storedUser = localStorage.getItem('shree_user');

      if (storedToken && storedUser) {
        try {
          const res = await api.get('/auth/me');
          setToken(storedToken);
          setUser(res.data);
        } catch {
          localStorage.removeItem('shree_token');
          localStorage.removeItem('shree_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Watch unauthenticated redirects
  useEffect(() => {
    if (!loading) {
      if (!token && pathname !== '/' && pathname !== '/login') {
        // No token and not on a public page: send user to landing page
        router.replace('/');
      } else if (token && (pathname === '/login' || pathname === '/')) {
        // Authenticated user should go to dashboard
        router.replace('/open');
      }
    }
  }, [token, pathname, loading, router]);

  const login = async (email: string, password: string) => {
    try {
      const trimmedEmail = (email || '').trim().toLowerCase();
      const trimmedPassword = (password || '').trim();
      const res = await api.post('/auth/login', { email: trimmedEmail, password: trimmedPassword });
      const { token: receivedToken, user: receivedUser } = res.data;

      localStorage.setItem('shree_token', receivedToken);
      localStorage.setItem('shree_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);

      router.push('/open');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please verify credentials.';
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('shree_token');
    localStorage.removeItem('shree_user');
    setToken(null);
    setUser(null);
    router.replace('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
