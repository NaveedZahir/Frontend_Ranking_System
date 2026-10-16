// src/context/AuthContext.jsx
import { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Pre-fill with a mock Admin user so you don't even have to type credentials
  const [user, setUser] = useState({
    id: 'mock-user-1',
    email: 'admin@example.com',
    name: 'Demo Admin',
    role: 'ADMIN',
  });
  const [token, setToken] = useState('mock-jwt-token-12345');

  const login = (userData, userToken) => {
    // Dummy login: accepts any email/password
    setUser({
      id: 'mock-user-1',
      email: userData?.email || 'admin@example.com',
      name: 'Demo User',
      role: 'ADMIN',
    });
    setToken('mock-jwt-token-12345');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);