import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Channel, Message } from '../types';
import { apiService } from '../services/api';
import { websocketService } from '../services/websocket';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../contexts/NotificationContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface ChatRoomProps {
  channel: Channel;
}

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

export default function ChatRoom({ channel }: ChatRoomProps) {
  const { user } = useAuth();
  const { addNotification, showBrowserNotification, playNotificationSound } = useNotifications();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [channelUsers, setChannelUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const isUserSending = useRef<boolean>(false);

  useEffect(() => {
    loadMessages();
    loadChannelUsers();
    
    // デバッグ: 現在のユーザーとチャンネル情報をログ出力
    console.log('🏠 ChatRoom loaded:', {
      channelId: channel.id,
      channelName: channel.name,
      currentUserId: user?.id,
      currentUsername: user?.username
    });
  }, [channel.id]);

  // 初期ロード時に最下部にスクロール（useLayoutEffect でブラウザ描画前に実行）
  useLayoutEffect(() => {
    if (messages.length > 0) {
      // ブラウザ描画前にスクロール位置を調整（ユーザーには見えない）
      scrollToBottom(false);
    }
  }, [messages.length > 0 ? messages[0]?.id : null]); // 最初のメッセージロード時のみ実行

  useEffect(() => {
    // Only register message handler for this channel, don't manage connection
    if (user && websocketService.isConnected()) {
      console.log('📝 ChatRoom: Registering channel-specific message handler');
      const unsubscribe = websocketService.onMessage((message) => {
        console.log('🎯 ChatRoom handler received message:', { 
          messageType: message.type, 
          messageChannelId: message.channel_id, 
          currentChannelId: channel.id.toString(),
        });
        
        // Only process messages for this specific channel - let other handlers process other types
        if (message.type === 'message' && message.channel_id === channel.id.toString()) {
          console.log('📨 Processing message for current channel');
          
          // Create simpler message ID to prevent duplicate processing
          // Use a shorter ID to reduce false positive duplicates
          const messageId = `${message.user_id}-${message.channel_id}-${message.content.substring(0, 50)}`;
          
          console.log('🔍 Processing message with ID:', messageId);
          
          // Check if we've already processed this message (shorter time window)
          if (processedMessageIds.current.has(messageId)) {
            console.log('🔄 Skipping duplicate message:', messageId);
            return;
          }
          
          // Mark message as processed
          processedMessageIds.current.add(messageId);
          
          // Clean up old message IDs more aggressively (keep only last 20)
          if (processedMessageIds.current.size > 20) {
            const idsArray = Array.from(processedMessageIds.current);
            processedMessageIds.current = new Set(idsArray.slice(-10));
          }
          
          // Reload messages without loading indicator for WebSocket updates
          loadMessages(false);
          
          // Only show notifications for messages from other users
          if (message.user_id !== user.id.toString()) {
            // Show notification for new messages
            const isWindowFocused = document.hasFocus();
            const senderName = message.sender_name || `ユーザー${message.user_id}`;
            
            // Check if current user is mentioned (using same logic as MentionText)
            const isMentioned = user && checkIfUserMentioned(message.content, user);
            
            console.log('📨 New message received:', {
              content: message.content,
              sender: senderName,
              messageUserId: message.user_id,
              currentUserId: user?.id,
              currentUser: user?.username,
              currentUserDisplay: user?.display_name,
              isMentioned,
              isWindowFocused,
              shouldShowBrowserNotification: !isWindowFocused || isMentioned,
              isFromOtherUser: message.user_id !== user?.id?.toString()
            });
            
            // Browser notification logic
            const shouldShowBrowserNotification = !isWindowFocused || isMentioned;
            
            if (shouldShowBrowserNotification) {
              const notificationTitle = isMentioned 
                ? `💬 メンション - #${channel.name}`
                : `#${channel.name}`;
              
              const notificationOptions = {
                tag: isMentioned ? `mention-${channel.id}-${Date.now()}` : `channel-${channel.id}`,
                renotify: true,
                requireInteraction: isMentioned,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
              };
              
              console.log('🔔 Attempting to show browser notification:', {
                title: notificationTitle,
                body: `${senderName}: ${message.content}`,
                options: notificationOptions,
                isMentioned,
                shouldShow: shouldShowBrowserNotification
              });
              
              showBrowserNotification(
                notificationTitle,
                `${senderName}: ${message.content}`,
                notificationOptions
              );
            } else {
              console.log('🔕 Skipping browser notification:', {
                shouldShowBrowserNotification,
                isWindowFocused,
                isMentioned
              });
            }

            // Play notification sound
            playNotificationSound(isMentioned);

            // In-app notification with mention priority
            addNotification({
              type: isMentioned ? 'warning' : 'info',
              title: isMentioned 
                ? `💬 あなたがメンションされました - #${channel.name}`
                : `新しいメッセージ - #${channel.name}`,
              message: `${senderName}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
              autoHide: true,
              duration: isMentioned ? 8000 : 4000,
            });
          }
        } else if (message.type === 'typing' && message.channel_id === channel.id.toString()) {
          // Handle typing indicators
          const typingUserId = message.user_id;
          const isTyping = message.is_typing;
          const userName = message.user_name || `ユーザー${typingUserId}`;
          
          if (typingUserId !== user.id.toString()) {
            setTypingUsers(prev => {
              if (isTyping) {
                // Add user to typing list if not already there
                return prev.includes(userName) ? prev : [...prev, userName];
              } else {
                // Remove user from typing list
                return prev.filter(name => name !== userName);
              }
            });
          }
        }
        // Do NOT handle user_connected/user_disconnected here - let OnlineStatusProvider handle those
      });
      
      return () => {
        console.log('📝 ChatRoom: Cleaning up channel-specific handler');
        unsubscribe();
      };
    }
  }, [user, channel.id, websocketService.isConnected()]);

  // WebSocket接続状態の監視はGlobalWebSocketProviderで管理
  // useEffect(() => {
  //   if (!user) return;

  //   const checkConnection = () => {
  //     const isConnected = websocketService.isConnected();
  //     const wsReadyState = (window as any).websocketService?.ws?.readyState;
      
  //     console.log('🔍 WebSocket health check:', {
  //       isConnected,
  //       userId: user.id,
  //       readyState: wsReadyState,
  //       readyStateText: wsReadyState === 0 ? 'CONNECTING' : 
  //                     wsReadyState === 1 ? 'OPEN' : 
  //                     wsReadyState === 2 ? 'CLOSING' : 
  //                     wsReadyState === 3 ? 'CLOSED' : 'UNKNOWN'
  //     });

  //     // 接続が切れている場合は再接続を試行
  //     if (!isConnected) {
  //       console.log('🔌 WebSocket disconnected, attempting reconnection...');
  //       connectWebSocket().catch(error => {
  //         console.error('❌ Health check reconnection failed:', error);
  //       });
  //     }
  //   };

  //   // 最初に即座にチェック
  //   setTimeout(checkConnection, 2000);
    
  //   // その後10秒ごとにWebSocket接続をチェック（より頻繁に）
  //   const healthCheckInterval = setInterval(checkConnection, 10000);

  //   return () => {
  //     clearInterval(healthCheckInterval);
  //   };
  // }, [user]);

  useEffect(() => {
    // Only auto-scroll if user is sending a message or already at bottom
    if (isUserSending.current) {
      // User just sent a message, always scroll to bottom
      scrollToBottom();
      isUserSending.current = false;
    } else {
      // Check if user was already at bottom before scrolling
      const messagesContainer = messagesEndRef.current?.parentElement;
      if (messagesContainer) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        
        if (isAtBottom) {
          scrollToBottom();
        }
      }
    }
  }, [messages]);

  const connectWebSocket = async () => {
    if (!user) {
      console.warn('❌ Cannot connect WebSocket: no user');
      return;
    }

    try {
      console.log('🔌 Attempting WebSocket connection for user:', user.id, user.username);
      console.log('🔌 WebSocket URL will be:', `ws://localhost:8000/ws/${user.id}`);
      
      // Check if already connected
      if (websocketService.isConnected()) {
        console.log('✅ WebSocket already connected, registering handler');
      } else {
        // 既存のハンドラーをクリア（重複を防ぐ）
        websocketService.disconnect();
        
        // 接続を確立
        await websocketService.connect(user.id.toString());
        console.log('✅ WebSocket connected successfully');
      }
      
      // Don't clear all handlers - this would remove OnlineStatusProvider handler
      // Instead, let WebSocket service handle duplicate registration
      console.log('📝 Registering additional WebSocket handler for ChatRoom');
      
      // Listen for new messages
      console.log('📝 Registering WebSocket message handler for channel:', channel.id);
      const unsubscribe = websocketService.onMessage((message) => {
        console.log('🎯 Message handler called:', { 
          messageType: message.type, 
          messageChannelId: message.channel_id, 
          currentChannelId: channel.id.toString(),
          messageSenderId: message.user_id,
          currentUserId: user.id.toString(),
          isForThisChannel: message.type === 'message' && message.channel_id === channel.id.toString(),
          isFromOtherUser: message.user_id !== user.id.toString()
        });
        
        if (message.type === 'message' && message.channel_id === channel.id.toString()) {
          // Debug: Log the full message structure
          console.log('📨 Received WebSocket message:', {
            type: message.type,
            user_id: message.user_id,
            channel_id: message.channel_id,
            content: message.content,
            timestamp: message.timestamp,
            sender_name: message.sender_name,
            fullMessage: message
          });
          
          // Create simpler message ID to prevent duplicate processing
          // Use a shorter ID to reduce false positive duplicates
          const messageId = `${message.user_id}-${message.channel_id}-${message.content.substring(0, 50)}`;
          
          console.log('🔍 Processing message with ID:', messageId);
          
          // Check if we've already processed this message (shorter time window)
          if (processedMessageIds.current.has(messageId)) {
            console.log('🔄 Skipping duplicate message:', messageId);
            return;
          }
          
          // Mark message as processed
          processedMessageIds.current.add(messageId);
          
          // Clean up old message IDs more aggressively (keep only last 20)
          if (processedMessageIds.current.size > 20) {
            const idsArray = Array.from(processedMessageIds.current);
            processedMessageIds.current = new Set(idsArray.slice(-10));
          }
          
          // Reload messages without loading indicator for WebSocket updates
          loadMessages(false);
          
          // Only show notifications for messages from other users
          if (message.user_id !== user.id.toString()) {
            // Show notification for new messages
            const isWindowFocused = document.hasFocus();
            const senderName = message.sender_name || `ユーザー${message.user_id}`;
            
            // Check if current user is mentioned (using same logic as MentionText)
            const isMentioned = user && checkIfUserMentioned(message.content, user);
            
            console.log('📨 New message received:', {
              content: message.content,
              sender: senderName,
              messageUserId: message.user_id,
              currentUserId: user?.id,
              currentUser: user?.username,
              currentUserDisplay: user?.display_name,
              isMentioned,
              isWindowFocused,
              shouldShowBrowserNotification: !isWindowFocused || isMentioned,
              isFromOtherUser: message.user_id !== user?.id?.toString()
            });
            
            // Browser notification logic
            const shouldShowBrowserNotification = !isWindowFocused || isMentioned;
            
            if (shouldShowBrowserNotification) {
              const notificationTitle = isMentioned 
                ? `💬 メンション - #${channel.name}`
                : `#${channel.name}`;
              
              const notificationOptions = {
                tag: isMentioned ? `mention-${channel.id}-${Date.now()}` : `channel-${channel.id}`,
                renotify: true,
                requireInteraction: isMentioned,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
              };
              
              console.log('🔔 Attempting to show browser notification:', {
                title: notificationTitle,
                body: `${senderName}: ${message.content}`,
                options: notificationOptions,
                isMentioned,
                shouldShow: shouldShowBrowserNotification
              });
              
              showBrowserNotification(
                notificationTitle,
                `${senderName}: ${message.content}`,
                notificationOptions
              );
            } else {
              console.log('🔕 Skipping browser notification:', {
                shouldShowBrowserNotification,
                isWindowFocused,
                isMentioned
              });
            }

            // Play notification sound
            playNotificationSound(isMentioned);

            // In-app notification with mention priority
            addNotification({
              type: isMentioned ? 'warning' : 'info',
              title: isMentioned 
                ? `💬 あなたがメンションされました - #${channel.name}`
                : `新しいメッセージ - #${channel.name}`,
              message: `${senderName}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
              autoHide: true,
              duration: isMentioned ? 8000 : 4000,
            });
          }
        } else if (message.type === 'typing' && message.channel_id === channel.id.toString()) {
          // Handle typing indicators
          const typingUserId = message.user_id;
          const isTyping = message.is_typing;
          const userName = message.user_name || `ユーザー${typingUserId}`;
          
          if (typingUserId !== user.id.toString()) {
            setTypingUsers(prev => {
              if (isTyping) {
                // Add user to typing list if not already there
                return prev.includes(userName) ? prev : [...prev, userName];
              } else {
                // Remove user from typing list
                return prev.filter(name => name !== userName);
              }
            });
          }
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('🚨 CRITICAL: WebSocket handler registration failed:', error);
    }
  };

  const loadMessages = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      console.log(`Loading messages for channel ${channel.id}`);
      const messagesData = await apiService.getChannelMessages(channel.id);
      console.log(`Loaded ${messagesData.length} messages`);
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const loadChannelUsers = async () => {
    try {
      // For now, extract unique users from messages
      // In a real app, you'd have a proper channel members API
      const messagesData = await apiService.getChannelMessages(channel.id);
      const users = messagesData
        .filter(msg => msg.sender)
        .map(msg => msg.sender)
        .filter((user, index, array) => 
          array.findIndex(u => u?.id === user?.id) === index
        );
      setChannelUsers(users || []);
    } catch (error) {
      console.error('Failed to load channel users:', error);
      setChannelUsers([]);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!user) return;

    try {
      console.log(`Sending message: "${content}" to channel ${channel.id}`);
      
      // Mark that user is sending a message
      isUserSending.current = true;
      
      // Send via REST API for persistence
      const sentMessage = await apiService.sendMessage({
        content,
        channel_id: channel.id,
      });
      console.log('Message sent successfully:', sentMessage);

      // Reload messages without showing loading indicator to prevent scroll
      await loadMessages(false);

      // Also send via WebSocket for real-time to other users
      try {
        console.log('📤 Sending WebSocket message:', {
          content,
          channelId: channel.id.toString(),
          currentUserId: user.id
        });
        websocketService.sendChatMessage(content, channel.id.toString());
      } catch (wsError) {
        console.warn('WebSocket send failed, but message was saved:', wsError);
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // On error, also try to reload messages without loading indicator
      await loadMessages(false);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!user) return;
    
    try {
      websocketService.sendTypingIndicator(channel.id.toString(), isTyping);
    } catch (error) {
      console.warn('Failed to send typing indicator:', error);
    }
  };

  const scrollToBottom = (smooth: boolean = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Channel header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {channel.is_private ? '🔒' : '#'} {channel.name}
          </span>
          {channel.description && (
            <span className="text-sm text-gray-500 dark:text-gray-400">— {channel.description}</span>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400">メッセージを読み込み中...</div>
          </div>
        ) : (
          <MessageList messages={messages} currentUser={user} onReactionAdded={loadMessages} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0]}が入力中...`
                : typingUsers.length === 2
                ? `${typingUsers[0]}と${typingUsers[1]}が入力中...`
                : `${typingUsers.length}人が入力中...`
              }
            </span>
          </div>
        </div>
      )}

      {/* Message input */}
      <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <MessageInput 
          onSendMessage={handleSendMessage} 
          onTyping={handleTyping}
          channelUsers={channelUsers}
        />
      </div>
    </div>
  );
}