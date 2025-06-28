import { useState, useEffect } from 'react';
import { Message } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import MessageItem from './MessageItem';

interface PinnedMessagesProps {
  channelId: number;
  isOpen: boolean;
  onClose: () => void;
  onMessageNavigate?: (messageId: number, channelId: number) => void;
}

export default function PinnedMessages({ channelId, isOpen, onClose, onMessageNavigate }: PinnedMessagesProps) {
  const { user } = useAuth();
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPinnedMessages();
    }
  }, [isOpen, channelId]);

  const loadPinnedMessages = async () => {
    setLoading(true);
    try {
      const messages = await apiService.getPinnedMessages(channelId);
      setPinnedMessages(messages);
    } catch (error) {
      console.error('Failed to load pinned messages:', error);
      setPinnedMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpinMessage = async (messageId: number) => {
    if (!window.confirm('このメッセージのピン留めを解除しますか？')) {
      return;
    }

    try {
      await apiService.unpinMessage(messageId);
      // Remove from local state
      setPinnedMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Failed to unpin message:', error);
      alert('ピン留めの解除に失敗しました');
    }
  };

  const handleMessageClick = (messageId: number) => {
    if (onMessageNavigate) {
      onMessageNavigate(messageId, channelId);
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <span className="mr-2">📌</span>
              ピン留めメッセージ
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-600 dark:text-gray-400">読み込み中...</div>
            </div>
          ) : pinnedMessages.length > 0 ? (
            <div className="p-4 space-y-4">
              {pinnedMessages.map((message) => (
                <div 
                  key={message.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative"
                >
                  <div className="absolute top-2 right-2 flex items-center space-x-2">
                    <button
                      onClick={() => handleMessageClick(message.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors"
                      title="メッセージに移動"
                    >
                      移動
                    </button>
                    <button
                      onClick={() => handleUnpinMessage(message.id)}
                      className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
                      title="ピン留めを解除"
                    >
                      解除
                    </button>
                  </div>
                  
                  <MessageItem
                    message={message}
                    showHeader={true}
                    isOwn={user?.id === message.user_id}
                    onReactionAdded={loadPinnedMessages}
                  />
                  
                  {/* Pin info */}
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-2">
                    📌 {message.pinned_at ? new Date(message.pinned_at).toLocaleString('ja-JP') : ''} にピン留めされました
                    {message.pinned_by && ` by ${message.pinned_by}`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <div className="text-center text-gray-600 dark:text-gray-400">
                <p className="text-lg mb-2">📌</p>
                <p className="text-sm">ピン留めされたメッセージはありません</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div>
              {pinnedMessages.length > 0 && `${pinnedMessages.length}件のピン留めメッセージ`}
            </div>
            <div>
              Esc で閉じる
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}