import { useState, useEffect, useRef } from 'react';
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

export default function ChatRoom({ channel }: ChatRoomProps) {
  const { user } = useAuth();
  const { addNotification, showBrowserNotification } = useNotifications();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [channel.id]);

  useEffect(() => {
    // Connect to WebSocket when component mounts
    if (user) {
      connectWebSocket();
    }

    return () => {
      // Cleanup WebSocket connection
      websocketService.disconnect();
    };
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = async () => {
    if (!user) return;

    try {
      await websocketService.connect(user.id.toString());
      
      // Listen for new messages
      const unsubscribe = websocketService.onMessage((message) => {
        if (message.type === 'message' && message.channel_id === channel.id.toString()) {
          // Only reload if the message is from another user to avoid duplicate reloads
          if (message.user_id !== user.id.toString()) {
            loadMessages();
            
            // Show notification for new messages
            const isWindowFocused = document.hasFocus();
            const senderName = message.sender_name || `ユーザー${message.user_id}`;
            
            if (!isWindowFocused) {
              // Browser notification if window is not focused
              showBrowserNotification(
                `#${channel.name}`,
                `${senderName}: ${message.content}`,
                {
                  tag: `channel-${channel.id}`,
                  renotify: true,
                }
              );
            }
            
            // In-app notification
            addNotification({
              type: 'info',
              title: `新しいメッセージ - #${channel.name}`,
              message: `${senderName}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
              autoHide: true,
              duration: 4000,
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
      console.error('Failed to connect WebSocket:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      console.log(`Loading messages for channel ${channel.id}`);
      const messagesData = await apiService.getChannelMessages(channel.id);
      console.log(`Loaded ${messagesData.length} messages`);
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!user) return;

    try {
      console.log(`Sending message: "${content}" to channel ${channel.id}`);
      // Send via REST API for persistence
      const sentMessage = await apiService.sendMessage({
        content,
        channel_id: channel.id,
      });
      console.log('Message sent successfully:', sentMessage);

      // Always reload messages after successful send to ensure display
      await loadMessages();
      
      // Scroll to bottom to show new message
      setTimeout(() => {
        scrollToBottom();
      }, 100);

      // Also send via WebSocket for real-time to other users
      try {
        websocketService.sendChatMessage(content, channel.id.toString());
      } catch (wsError) {
        console.warn('WebSocket send failed, but message was saved:', wsError);
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // On error, also try to reload messages
      await loadMessages();
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        <MessageInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
      </div>
    </div>
  );
}