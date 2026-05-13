/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useContext } from 'react';

const AuthContext = createContext();
const AUTH_STORAGE_KEY = 'cbtrading-auth-v1';

const DEFAULT_ADMIN = {
  id: 1,
  email: 'admin@gmail.com',
  fullName: 'Admin CBTrading',
  phone: '0171-XXXXXXX',
};

const loadAuthState = () => {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, admin: null };
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return { isAuthenticated: false, admin: null };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      isAuthenticated: Boolean(parsed.isAuthenticated),
      admin: parsed.admin || null,
    };
  } catch (error) {
    console.error('Failed to parse auth state from localStorage:', error);
    return { isAuthenticated: false, admin: null };
  }
};

export const AuthProvider = ({ children }) => {
  const initialAuth = loadAuthState();
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuthenticated);
  const [admin, setAdmin] = useState(initialAuth.admin);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        isAuthenticated,
        admin,
      }),
    );
  }, [isAuthenticated, admin]);

  const login = (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const allowedEmails = ['admin@gmail.com', 'admin@cbtrading.com', 'admin123'];
    if (allowedEmails.includes(normalizedEmail) && password === 'Admin123') {
      setIsAuthenticated(true);
      setAdmin(DEFAULT_ADMIN);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
