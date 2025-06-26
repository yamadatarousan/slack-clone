import { useState, useEffect, useRef } from 'react';
import { Channel, Message } from '../types';
import { apiService } from '../services/api';
import { websocketService } from '../services/websocket';
import { useAuth } from '../hooks/useAuth';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface ChatRoomProps {
  channel: Channel;
}

export default function ChatRoom({ channel }: ChatRoomProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
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
          // Reload messages from server to get proper formatting and sender info
          loadMessages();
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
      const messagesData = await apiService.getChannelMessages(channel.id);
      console.log('Loaded messages:', messagesData);
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
      // Send via REST API for persistence
      await apiService.sendMessage({
        content,
        channel_id: channel.id,
      });

      // Also send via WebSocket for real-time
      websocketService.sendChatMessage(content, channel.id.toString());
      
      // Messages will be reloaded via WebSocket message handler
    } catch (error) {
      console.error('Failed to send message:', error);
      // On error, reload messages to ensure consistency
      await loadMessages();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Channel header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold text-gray-900">
            {channel.is_private ? '🔒' : '#'} {channel.name}
          </span>
          {channel.description && (
            <span className="text-sm text-gray-500">— {channel.description}</span>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500">メッセージを読み込み中...</div>
          </div>
        ) : (
          <MessageList messages={messages} currentUser={user} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <MessageInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}