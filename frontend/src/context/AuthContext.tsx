import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { ApiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<User>;
  switchUser: (demoKey: string) => Promise<User | null>;
  logout: () => void;
  getRoleDefaultPath: (role?: UserRole) => string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => { throw new Error('Uninitialized'); },
  switchUser: async () => null,
  logout: () => {},
  getRoleDefaultPath: () => '/login',
});

export const getRoleDefaultPath = (role?: UserRole): string => {
  switch (role) {
    case 'TRAINING_CENTRE':
      return '/training';
    case 'DISTRICT_OFFICER':
      return '/district';
    case 'QUALITY_TEAM':
      return '/quality';
    case 'STATE_OFFICE':
      return '/state';
    default:
      return '/login';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has an active token in localStorage
    const init = async () => {
      const token = localStorage.getItem('certiflow_token');
      if (!token) {
        // Requirement 1 & 2: No session = Unauthenticated. Do NOT auto-login!
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await ApiService.getProfile();
        // Requirement 8: Valid session is preserved on refresh!
        setUser(profile);
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        ApiService.clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const login = async (email: string, password = 'Password123!'): Promise<User> => {
    setLoading(true);
    try {
      const res = await ApiService.login(email, password);
      setUser(res.user);
      return res.user;
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const switchUser = async (demoKey: string): Promise<User | null> => {
    setLoading(true);
    if (demoKey === 'public') {
      ApiService.clearToken();
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const res = await ApiService.demoSwitch(demoKey);
      setUser(res.user);
      return res.user;
    } catch (err) {
      console.error('Failed to switch user:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Requirement 7: Clear session and reset user state
    ApiService.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        switchUser,
        logout,
        getRoleDefaultPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
