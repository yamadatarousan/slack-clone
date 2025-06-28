import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from './NotificationContext';
import { websocketService } from '../services/websocket';
import { WebSocketMessage } from '../types';

interface GlobalWebSocketContextType {
  // 必要に応じて追加
}

const GlobalWebSocketContext = createContext<GlobalWebSocketContextType | undefined>(undefined);

// Unified mention detection function (same logic as MentionText component)
const checkIfUserMentioned = (content: string, user: any): boolean => {
  if (!user) return false;
  
  // Match @username or @"display name" patterns
  const mentionRegex = /@(\w+|"[^"]+"|'[^']+')/g;
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    // Extract username (remove quotes if present)
    let username = match[1];
    if ((username.startsWith('"') && username.endsWith('"')) || 
        (username.startsWith("'") && username.endsWith("'"))) {
      username = username.slice(1, -1);
    }
    
    // Check if this mention matches current user
    if (username === user.username || 
        (user.display_name && username === user.display_name)) {
      return true;
    }
  }
  
  return false;
};

interface GlobalWebSocketProviderProps {
  children: React.ReactNode;
}

export function GlobalWebSocketProvider({ children }: GlobalWebSocketProviderProps) {
  const { user } = useAuth();
  const { addNotification, showBrowserNotification, playNotificationSound } = useNotifications();
  const isConnected = useRef(false);
  const reconnectTimer = useRef<NodeJS.Timeout>();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user) {
      // ユーザーがログアウトした場合は自分のハンドラーだけクリア
      // (WebSocket接続自体は他のプロバイダーが使用している可能性があるため切断しない)
      isConnected.current = false;
      return;
    }

    connectGlobalWebSocket();

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      // Unsubscribe only our handler
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // Don't disconnect WebSocket here as other providers may be using it
      // websocketService.disconnect();
      isConnected.current = false;
    };
  }, [user]);

  const connectGlobalWebSocket = async () => {
    if (!user || isConnected.current) return;

    try {
      console.log('🌐 Connecting global WebSocket for user:', user.id, user.username);
      
      // Check if already connected to avoid disrupting existing handlers
      if (!websocketService.isConnected()) {
        // WebSocket接続を確立
        await websocketService.connect(user.id.toString());
      }
      isConnected.current = true;
      
      console.log('✅ Global WebSocket connected successfully');
      
      // グローバルメッセージハンドラーを登録
      unsubscribeRef.current = websocketService.onMessage(handleGlobalMessage);
      
      // ヘルスチェックを開始
      startHealthCheck();
      
    } catch (error) {
      console.error('❌ Global WebSocket connection failed:', error);
      isConnected.current = false;
      
      // 5秒後に再接続を試行
      reconnectTimer.current = setTimeout(() => {
        connectGlobalWebSocket();
      }, 5000);
    }
  };

  const handleGlobalMessage = (message: WebSocketMessage) => {
    console.log('🌐 Global message handler called:', {
      messageType: message.type,
      messageChannelId: message.channel_id,
      messageSenderId: message.user_id,
      currentUserId: user?.id
    });

    // Only handle message type notifications here, ignore user_connected/user_disconnected
    // Those are handled by OnlineStatusProvider
    if (message.type === 'message') {
      // 他のユーザーからのメッセージかチェック
      const isFromOtherUser = message.user_id !== user?.id?.toString();
      
      console.log('🌐 GlobalWebSocketProvider: Processing message for notifications only');
      
      if (isFromOtherUser) {
        const senderName = message.sender_name || `ユーザー${message.user_id}`;
        
        // メンション検出
        const isMentioned = user && checkIfUserMentioned(message.content, user);
        
        console.log('🌐 Processing global message:', {
          content: message.content,
          sender: senderName,
          channelId: message.channel_id,
          isMentioned,
          currentUser: user?.username
        });

        if (isMentioned) {
          // メンション通知を表示（チャンネル情報も含める）
          const channelName = `チャンネル ${message.channel_id}`;
          
          console.log('🔔 Showing global mention notification');
          
          // ブラウザ通知
          showBrowserNotification(
            `💬 メンション - #${channelName}`,
            `${senderName}: ${message.content}`,
            {
              tag: `global-mention-${message.channel_id}-${Date.now()}`,
              renotify: true,
              requireInteraction: true,
              icon: '/favicon.ico'
            }
          );

          // 音声通知
          playNotificationSound(true);

          // アプリ内通知
          addNotification({
            type: 'warning',
            title: `💬 あなたがメンションされました - #${channelName}`,
            message: `${senderName}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
            autoHide: true,
            duration: 8000,
          });
        }
      }
    }
  };

  const startHealthCheck = () => {
    const checkConnection = () => {
      const connected = websocketService.isConnected();
      
      if (!connected && user) {
        console.log('🌐 Global WebSocket disconnected, attempting reconnection...');
        isConnected.current = false;
        connectGlobalWebSocket();
      }
    };

    // 30秒ごとにヘルスチェック
    const healthCheckInterval = setInterval(checkConnection, 30000);
    
    // クリーンアップ時にインターバルをクリア
    return () => {
      clearInterval(healthCheckInterval);
    };
  };

  return (
    <GlobalWebSocketContext.Provider value={{}}>
      {children}
    </GlobalWebSocketContext.Provider>
  );
}

export function useGlobalWebSocket(): GlobalWebSocketContextType {
  const context = useContext(GlobalWebSocketContext);
  if (context === undefined) {
    throw new Error('useGlobalWebSocket must be used within a GlobalWebSocketProvider');
  }
  return context;
}