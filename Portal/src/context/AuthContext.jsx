/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useContext } from 'react';
import { apiPaths, postJson } from '../services/apiClient';

const AuthContext = createContext();
const AUTH_STORAGE_KEY = 'cbtrading-auth-v1';

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
    const savedAdmin = parsed.admin || null;
    if (savedAdmin?.role === 'WHOLESALER' && !savedAdmin.wholesalerId) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return { isAuthenticated: false, admin: null };
    }
    return {
      isAuthenticated: Boolean(parsed.isAuthenticated),
      admin: savedAdmin,
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

  const login = async (email, password) => {
    const payload = await postJson(apiPaths.authLogin, { email, password });

    if (payload?.role === 'WHOLESALER' && !payload.wholesalerId) {
      throw new Error('Wholesaler profile not found. Ask admin to create the wholesaler profile again.');
    }

    setIsAuthenticated(true);
    setAdmin(payload);
    return payload;
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
