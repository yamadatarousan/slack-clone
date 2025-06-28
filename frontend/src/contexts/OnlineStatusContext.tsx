import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WebSocketMessage } from '../types';
import { websocketService } from '../services/websocket';

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
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());

  useEffect(() => {
    const handleWebSocketMessage = (message: WebSocketMessage) => {
      if (message.type === 'user_connected') {
        console.log('📗 User connected:', message);
        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(message.user_id!, {
            id: message.user_id!,
            username: message.username!,
            display_name: message.display_name,
            is_online: true
          });
          return newMap;
        });
      } else if (message.type === 'user_disconnected') {
        console.log('📕 User disconnected:', message);
        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          const user = newMap.get(message.user_id!);
          if (user) {
            newMap.set(message.user_id!, {
              ...user,
              is_online: false,
              last_seen: new Date().toISOString()
            });
          }
          return newMap;
        });
      }
    };

    // WebSocketメッセージハンドラーを登録
    const unsubscribe = websocketService.onMessage(handleWebSocketMessage);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const isUserOnline = (userId: string): boolean => {
    const user = onlineUsers.get(userId);
    return user?.is_online || false;
  };

  const getOnlineCount = (): number => {
    return Array.from(onlineUsers.values()).filter(user => user.is_online).length;
  };

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