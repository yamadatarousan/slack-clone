import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';

interface OnlineStatusContextType {
  onlineCount: number;
  isUserOnline: (userId: string) => boolean;
}

const OnlineStatusContext = createContext<OnlineStatusContextType | undefined>(undefined);

interface OnlineStatusProviderProps {
  children: ReactNode;
}

export function OnlineStatusProvider({ children }: OnlineStatusProviderProps) {
  const { user } = useAuth();
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const fetchOnlineStatus = async () => {
    try {
      const data = await apiService.getOnlineUsers();
      setOnlineCount(data.count || 0);
      
      const userIdSet = new Set<string>();
      if (data.online_users && Array.isArray(data.online_users)) {
        data.online_users.forEach(user => {
          userIdSet.add(user.id.toString());
        });
      }
      setOnlineUserIds(userIdSet);
    } catch (error) {
      console.error('Failed to fetch online status:', error);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // 初回取得
    fetchOnlineStatus();
    
    // 10秒ごとにポーリング
    const interval = setInterval(fetchOnlineStatus, 10000);
    
    return () => clearInterval(interval);
  }, [user]);

  const isUserOnline = (userId: string): boolean => {
    return onlineUserIds.has(userId);
  };

  return (
    <OnlineStatusContext.Provider value={{
      onlineCount,
      isUserOnline
    }}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

export function useOnlineStatus(): OnlineStatusContextType {
  const context = useContext(OnlineStatusContext);
  if (context === undefined) {
    throw new Error('useOnlineStatus must be used within an OnlineStatusProvider');
  }
  return context;
}