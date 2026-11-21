import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { ApiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  switchUser: (demoKey: string) => Promise<void>;
  logout: () => void;
  isPublicMode: boolean;
  setPublicMode: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  switchUser: async () => {},
  logout: () => {},
  isPublicMode: false,
  setPublicMode: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPublicMode, setPublicMode] = useState(false);

  useEffect(() => {
    // Initial load: Default to Anika (Training Centre) so demo is immediately live and interactive!
    const init = async () => {
      try {
        const profile = await ApiService.getProfile();
        setUser(profile);
      } catch (err) {
        // Fallback to switching to Anika by default
        try {
          const res = await ApiService.demoSwitch('anika');
          setUser(res.user);
        } catch {
          // If backend not up yet, state will be refreshed when user interacts
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const switchUser = async (demoKey: string) => {
    setLoading(true);
    if (demoKey === 'public') {
      setPublicMode(true);
      setUser(null);
      ApiService.clearToken();
      setLoading(false);
      return;
    }

    try {
      setPublicMode(false);
      const res = await ApiService.demoSwitch(demoKey);
      setUser(res.user);
    } catch (err) {
      console.error('Failed to switch user:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    ApiService.clearToken();
    setUser(null);
    setPublicMode(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        switchUser,
        logout,
        isPublicMode,
        setPublicMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
