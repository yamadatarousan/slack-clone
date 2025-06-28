import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User, LoginCredentials, RegisterData } from '../types';
import { apiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Auth effect: token exists?', !!token);
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  // ページ離脱時にオンライン状態をfalseに設定
  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = () => {
      // beforeunloadでAPIを呼ぶのは不確実なので、sendBeaconを使用
      try {
        const token = localStorage.getItem('token');
        if (token) {
          navigator.sendBeacon(
            'http://localhost:8000/auth/logout',
            new Blob([''], { type: 'application/json' })
          );
        }
      } catch (error) {
        console.warn('Failed to update online status on page unload:', error);
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        try {
          await apiService.logout();
        } catch (error) {
          console.warn('Failed to update online status on visibility change:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const loadUser = async () => {
    try {
      console.log('Loading user...');
      
      // Add timeout to prevent infinite loading
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      // First check if API is accessible
      try {
        const healthCheck = await Promise.race([
          apiService.healthCheck(),
          timeout
        ]);
        console.log('Health check:', healthCheck);
      } catch (healthError) {
        console.error('Health check failed:', healthError);
        throw new Error('API server is not accessible');
      }
      
      const userData = await Promise.race([
        apiService.getMe(),
        timeout
      ]);
      console.log('User loaded:', userData);
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('token');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('Attempting login with:', credentials);
      const response = await apiService.login(credentials);
      console.log('Login response:', response);
      localStorage.setItem('token', response.access_token);
      
      await loadUser();
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
      const message = error.response?.data?.detail || error.message || 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('Attempting registration with:', { ...data, password: '[HIDDEN]' });
      await apiService.register(data);
      console.log('Registration successful');
      
      // Auto-login after registration
      await login({ username: data.username, password: data.password });
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response);
      const message = error.response?.data?.detail || error.message || 'Registration failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout API to set is_online = false
      await apiService.logout();
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with logout even if API fails
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const contextValue: AuthContextType = {
    user,
    login,
    register,
    logout,
    loading,
    error,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}