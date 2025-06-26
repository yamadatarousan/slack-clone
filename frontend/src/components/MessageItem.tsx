import { useState } from 'react';
import { Message } from '../types';
import { apiService } from '../services/api';

interface MessageItemProps {
  message: Message;
  showHeader: boolean;
  isOwn: boolean;
  onReactionAdded?: () => void;
}

export default function MessageItem({ message, showHeader, isOwn, onReactionAdded }: MessageItemProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDisplayName = () => {
    if (message.sender) {
      return message.sender.display_name || message.sender.username;
    }
    return `User ${message.user_id || message.sender_id || 'Unknown'}`;
  };

  const getAvatarInitial = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  const handleAddReaction = async (emoji: string) => {
    try {
      await apiService.addReaction(message.id, emoji);
      onReactionAdded?.();
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
    setShowEmojiPicker(false);
  };

  const popularEmojis = ['👍', '👎', '😀', '😢', '😮', '❤️', '🎉', '🚀'];

  return (
    <div className="group">
      {showHeader ? (
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-medium text-sm">
              {getAvatarInitial()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline space-x-2">
              <span className="font-medium text-gray-900">
                {getDisplayName()}
              </span>
              <span className="text-xs text-gray-500">
                {formatTime(message.created_at)}
              </span>
              {(message.edited || message.is_edited) && (
                <span className="text-xs text-gray-400">(編集済み)</span>
              )}
            </div>
            <div className="mt-1 relative">
              <p className="text-gray-900 whitespace-pre-wrap break-words">
                {message.content}
              </p>
              
              {/* Hover actions */}
              <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex space-x-1 bg-white border border-gray-200 rounded shadow-lg p-1">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="リアクションを追加"
                  >
                    😊
                  </button>
                </div>
              </div>
              
              {/* Emoji picker */}
              {showEmojiPicker && (
                <div className="absolute top-6 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                  <div className="grid grid-cols-4 gap-1">
                    {popularEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(emoji)}
                        className="p-2 text-lg hover:bg-gray-100 rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 flex-shrink-0">
            <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {formatTime(message.created_at)}
            </span>
          </div>
          <div className="flex-1 min-w-0 relative">
            <p className="text-gray-900 whitespace-pre-wrap break-words">
              {message.content}
            </p>
            
            {/* Hover actions */}
            <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex space-x-1 bg-white border border-gray-200 rounded shadow-lg p-1">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                  title="リアクションを追加"
                >
                  😊
                </button>
              </div>
            </div>
            
            {/* Emoji picker */}
            {showEmojiPicker && (
              <div className="absolute top-6 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                <div className="grid grid-cols-4 gap-1">
                  {popularEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleAddReaction(emoji)}
                      className="p-2 text-lg hover:bg-gray-100 rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="ml-11 mt-1 flex flex-wrap gap-1">
          {/* Group reactions by emoji */}
          {(() => {
            const reactionGroups = message.reactions.reduce((groups: Record<string, any[]>, reaction) => {
              if (!groups[reaction.emoji]) {
                groups[reaction.emoji] = [];
              }
              groups[reaction.emoji].push(reaction);
              return groups;
            }, {});

            return Object.entries(reactionGroups).map(([emoji, reactions]) => (
              <button
                key={emoji}
                onClick={() => handleAddReaction(emoji)}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 transition-colors"
                title={`${reactions.length}人がリアクションしました`}
              >
                <span>{emoji}</span>
                <span className="ml-1 text-gray-600">{reactions.length}</span>
              </button>
            ));
          })()}
        </div>
      )}
    </div>
  );
}