import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WebSocketMessage } from '../types';
import { websocketService } from '../services/websocket';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';

interface OnlineUser {
  id: string;
  username: string;
  display_name?: string;
  is_online: boolean;
  last_seen?: string;
}

interface OnlineStatusContextType {
  onlineUsers: Map<string, OnlineUser>;
  isUserOnline: (userId: string) => boolean;
  getOnlineCount: () => number;
  updateUserStatus: (userId: string, isOnline: boolean) => void;
}

const OnlineStatusContext = createContext<OnlineStatusContextType | undefined>(undefined);

interface OnlineStatusProviderProps {
  children: ReactNode;
}

export function OnlineStatusProvider({ children }: OnlineStatusProviderProps) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());

  // サーバーからオンライン状態を同期
  const syncOnlineStatus = async () => {
    try {
      const data = await apiService.getOnlineUsers();
      const newMap = new Map<string, OnlineUser>();
      
      if (data.online_users && Array.isArray(data.online_users)) {
        data.online_users.forEach(user => {
          newMap.set(user.id.toString(), {
            id: user.id.toString(),
            username: user.username,
            display_name: user.display_name,
            is_online: true
          });
        });
      }
      
      setOnlineUsers(newMap);
      console.log(`🔄 Synced online status: ${data.count || 0} users online`);
    } catch (error) {
      console.error('Failed to sync online status:', error);
      // エラーが発生してもアプリを続行
    }
  };

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    const handleWebSocketMessage = (message: WebSocketMessage) => {
      if (message.type === 'user_connected' || message.type === 'user_disconnected') {
        // すぐにサーバーから最新状態を取得
        syncOnlineStatus();
      }
    };

    // WebSocketハンドラーを登録
    const unsubscribe = websocketService.onMessage(handleWebSocketMessage);
    
    // 接続時に即座に同期
    if (websocketService.isConnected()) {
      syncOnlineStatus();
    }
    
    // 10秒ごとにサーバーから状態を同期（確実性のため）
    pollInterval = setInterval(() => {
      if (websocketService.isConnected()) {
        syncOnlineStatus();
      }
    }, 10000);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []);

  // ユーザーがログインした時にオンライン状態を同期
  useEffect(() => {
    if (user && websocketService.isConnected()) {
      // WebSocket接続後に同期
      setTimeout(syncOnlineStatus, 1000);
    }
  }, [user]);

  const isUserOnline = (userId: string): boolean => {
    const user = onlineUsers.get(userId);
    return user?.is_online || false;
  };

  const getOnlineCount = (): number => {
    const onlineCount = Array.from(onlineUsers.values()).filter(user => user.is_online).length;
    console.log('🔢 getOnlineCount:', {
      totalUsers: onlineUsers.size,
      onlineCount,
      users: Array.from(onlineUsers.entries()),
      timestamp: new Date().toISOString()
    });
    return onlineCount;
  };
  
  // サーバーから強制同期する関数
  (window as any).syncOnlineStatus = syncOnlineStatus;

  const updateUserStatus = (userId: string, isOnline: boolean): void => {
    setOnlineUsers(prev => {
      const newMap = new Map(prev);
      const user = newMap.get(userId);
      if (user) {
        newMap.set(userId, {
          ...user,
          is_online: isOnline,
          last_seen: isOnline ? undefined : new Date().toISOString()
        });
      }
      return newMap;
    });
  };

  return (
    <OnlineStatusContext.Provider value={{
      onlineUsers,
      isUserOnline,
      getOnlineCount,
      updateUserStatus
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