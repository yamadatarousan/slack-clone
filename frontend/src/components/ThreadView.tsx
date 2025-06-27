import { useState, useEffect } from 'react';
import { Message } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';

interface ThreadViewProps {
  isOpen: boolean;
  onClose: () => void;
  parentMessage: Message | null;
  onReplyAdded?: () => void;
}

export default function ThreadView({ isOpen, onClose, parentMessage, onReplyAdded }: ThreadViewProps) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && parentMessage) {
      loadReplies();
    }
  }, [isOpen, parentMessage?.id]);

  const loadReplies = async () => {
    if (!parentMessage) return;
    
    try {
      setLoading(true);
      const threadMessages = await apiService.getMessageThread(parentMessage.id);
      setReplies(threadMessages);
    } catch (error) {
      console.error('Failed to load thread replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (content: string) => {
    if (!parentMessage) return;

    try {
      await apiService.sendMessage({
        content,
        channel_id: parentMessage.channel_id,
        parent_message_id: parentMessage.id,
      });
      
      // Reload replies
      await loadReplies();
      onReplyAdded?.();
    } catch (error) {
      console.error('Failed to send reply:', error);
    }
  };

  if (!isOpen || !parentMessage) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              スレッド
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {replies.length}件の返信
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Thread content */}
        <div className="flex-1 overflow-y-auto">
          {/* Parent message */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="mb-2">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                元のメッセージ
              </span>
            </div>
            <MessageItem
              message={parentMessage}
              showHeader={true}
              isOwn={parentMessage.user_id === user?.id}
            />
          </div>

          {/* Replies */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">読み込み中...</span>
              </div>
            ) : replies.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>まだ返信がありません</p>
                <p className="text-sm mt-1">最初の返信を送信してみましょう！</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {replies.length}件の返信
                </div>
                
                {replies.map((reply) => (
                  <div key={reply.id} className="border-l-2 border-blue-200 dark:border-blue-700 pl-4">
                    <MessageItem
                      message={reply}
                      showHeader={true}
                      isOwn={reply.user_id === user?.id}
                      onReactionAdded={loadReplies}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reply input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            スレッドで返信
          </div>
          <MessageInput 
            onSendMessage={handleSendReply}
            placeholder="返信を入力..."
          />
        </div>
      </div>
    </div>
  );
}