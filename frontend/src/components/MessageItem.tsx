import { useState, useRef } from 'react';
import { Message } from '../types';
import { apiService } from '../services/api';
import ThreadView from './ThreadView';
import EmojiPicker from './EmojiPicker';
import FileMessage from './FileMessage';
import MentionText from './MentionText';

interface MessageItemProps {
  message: Message;
  showHeader: boolean;
  isOwn: boolean;
  onReactionAdded?: () => void;
}

export default function MessageItem({ message, showHeader, isOwn, onReactionAdded }: MessageItemProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
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

  const getEmojiPickerPosition = () => {
    if (emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      return {
        top: rect.bottom + 5,
        left: rect.left,
      };
    }
    return { top: 0, left: 0 };
  };


  const getStatusColor = (sender: any) => {
    if (!sender || !sender.is_online) return 'bg-gray-400';
    switch (sender.status) {
      case 'active': return 'bg-green-400';
      case 'away': return 'bg-yellow-400';
      case 'busy': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  const parseFileMessage = (content: string) => {
    // Check if message is a file message format: "📎 filename\nfileUrl"
    // Accept both absolute URLs and relative paths
    const fileMessageRegex = /^📎\s+(.+)\n(.+)$/;
    const match = content.match(fileMessageRegex);
    
    if (match) {
      let fileUrl = match[2].trim();
      
      // If it's a relative path, make it absolute
      if (fileUrl.startsWith('/')) {
        fileUrl = `http://localhost:8000${fileUrl}`;
      }
      
      return {
        isFile: true,
        fileName: match[1].trim(),
        fileUrl: fileUrl
      };
    }
    
    return {
      isFile: false,
      content
    };
  };

  return (
    <div className="group">
      {showHeader ? (
        <div className="flex items-start space-x-3">
          <div className="relative">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-medium text-sm">
                {getAvatarInitial()}
              </span>
            </div>
            {message.sender && (
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(message.sender)}`}></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline space-x-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">
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
              {(() => {
                const parsedMessage = parseFileMessage(message.content);
                if (parsedMessage.isFile) {
                  return (
                    <FileMessage
                      fileName={parsedMessage.fileName!}
                      fileUrl={parsedMessage.fileUrl!}
                    />
                  );
                }
                return (
                  <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                    <MentionText content={message.content} />
                  </div>
                );
              })()}
              
              {/* Hover actions */}
              <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex space-x-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg p-1">
                  <button
                    ref={emojiButtonRef}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                    title="リアクションを追加"
                  >
                    😊
                  </button>
                  <button
                    onClick={() => setShowThread(true)}
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                    title="スレッドで返信"
                  >
                    💬
                  </button>
                </div>
              </div>
              
              <EmojiPicker
                isOpen={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                onEmojiSelect={handleAddReaction}
                position={getEmojiPickerPosition()}
              />
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
            {(() => {
              const parsedMessage = parseFileMessage(message.content);
              if (parsedMessage.isFile) {
                return (
                  <FileMessage
                    fileName={parsedMessage.fileName!}
                    fileUrl={parsedMessage.fileUrl!}
                  />
                );
              }
              return (
                <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                  <MentionText content={message.content} />
                </div>
              );
            })()}
            
            {/* Hover actions */}
            <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex space-x-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg p-1">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                  title="リアクションを追加"
                >
                  😊
                </button>
                <button
                  onClick={() => setShowThread(true)}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                  title="スレッドで返信"
                >
                  💬
                </button>
              </div>
            </div>
            
            <EmojiPicker
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onEmojiSelect={handleAddReaction}
              position={getEmojiPickerPosition()}
            />
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
      
      <ThreadView
        isOpen={showThread}
        onClose={() => setShowThread(false)}
        parentMessage={message}
        onReplyAdded={onReactionAdded}
      />
    </div>
  );
}