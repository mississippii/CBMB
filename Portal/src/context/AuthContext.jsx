import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);

  const login = (email, password) => {
    // Dummy authentication - in real app, this would call backend
    if (email === 'admin@gmail.com' && password === 'Admin123') {
      setIsAuthenticated(true);
      setAdmin({
        id: 1,
        email: 'admin@gmail.com',
        fullName: 'Admin CBTrading',
        phone: '0171-XXXXXXX',
      });
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
