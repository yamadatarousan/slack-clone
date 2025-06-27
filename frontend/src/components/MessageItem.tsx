import { useState, useRef } from 'react';
import { Message } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
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
  const { user } = useAuth();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
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

  const handleReactionClick = async (emoji: string, reactions: any[]) => {
    if (!user) return;
    
    // Check if current user has already reacted with this emoji
    const userReaction = reactions.find(r => r.user_id === user.id);
    
    if (userReaction) {
      // User has already reacted, so remove the reaction
      // Note: API service needs removeReaction method
      console.log('User already reacted, would remove reaction');
      // For now, just add the reaction (backend should handle duplicates)
      await handleAddReaction(emoji);
    } else {
      // User hasn't reacted, so add the reaction
      await handleAddReaction(emoji);
    }
  };

  const handleDeleteMessage = async () => {
    if (!window.confirm('このメッセージを削除しますか？')) {
      return;
    }
    
    try {
      await apiService.deleteMessage(message.id);
      onReactionAdded?.(); // Refresh messages
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('メッセージの削除に失敗しました');
    }
  };

  const handleEditMessage = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }
    
    try {
      await apiService.updateMessage(message.id, { content: editContent });
      onReactionAdded?.(); // Refresh messages
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to edit message:', error);
      alert('メッセージの編集に失敗しました');
      setEditContent(message.content); // Reset content
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditMessage();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getEmojiPickerPosition = () => {
    if (emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const pickerWidth = 320; // EmojiPicker width
      const pickerHeight = 384; // EmojiPicker height
      
      let top = rect.bottom + 5;
      let left = rect.left;
      
      // Adjust if picker would go off right edge
      if (left + pickerWidth > viewportWidth) {
        left = rect.right - pickerWidth;
      }
      
      // Adjust if picker would go off bottom edge
      if (top + pickerHeight > viewportHeight) {
        top = rect.top - pickerHeight - 5;
      }
      
      // Ensure minimum margins
      left = Math.max(10, Math.min(left, viewportWidth - pickerWidth - 10));
      top = Math.max(10, Math.min(top, viewportHeight - pickerHeight - 10));
      
      return { top, left };
    }
    return { top: 100, left: 100 }; // Fallback position
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
                if (isEditing) {
                  return (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex space-x-2 text-sm">
                        <button
                          onClick={handleEditMessage}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                        >
                          キャンセル
                        </button>
                        <span className="text-gray-500 self-center">
                          Enterで保存 • Escでキャンセル
                        </span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                    <MentionText content={message.content} />
                  </div>
                );
              })()}
              
              {/* Hover actions - 改善された位置決め */}
              <div className="absolute top-0 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="flex space-x-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg p-1">
                  <button
                    ref={emojiButtonRef}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-sm"
                    title="リアクションを追加"
                  >
                    😊
                  </button>
                  <button
                    onClick={() => setShowThread(true)}
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-sm"
                    title="スレッドで返信"
                  >
                    💬
                  </button>
                  {isOwn && (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900 rounded text-sm"
                        title="メッセージを編集"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={handleDeleteMessage}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900 rounded text-sm"
                        title="メッセージを削除"
                      >
                        🗑️
                      </button>
                    </>
                  )}
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
              if (isEditing) {
                return (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex space-x-2 text-sm">
                      <button
                        onClick={handleEditMessage}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        保存
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                      >
                        キャンセル
                      </button>
                      <span className="text-gray-500 self-center">
                        Enterで保存 • Escでキャンセル
                      </span>
                    </div>
                  </div>
                );
              }
              return (
                <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                  <MentionText content={message.content} />
                </div>
              );
            })()}
            
            {/* Hover actions - 改善された位置決め */}
            <div className="absolute top-0 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <div className="flex space-x-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg p-1">
                <button
                  ref={emojiButtonRef}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-sm"
                  title="リアクションを追加"
                >
                  😊
                </button>
                <button
                  onClick={() => setShowThread(true)}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-sm"
                  title="スレッドで返信"
                >
                  💬
                </button>
                {isOwn && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900 rounded text-sm"
                      title="メッセージを編集"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={handleDeleteMessage}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900 rounded text-sm"
                      title="メッセージを削除"
                    >
                      🗑️
                    </button>
                  </>
                )}
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

            return Object.entries(reactionGroups).map(([emoji, reactions]) => {
              // Check if current user has reacted with this emoji
              const userHasReacted = user && reactions.some(r => r.user_id === user.id);
              
              return (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji, reactions)}
                  className={`inline-flex items-center px-2 py-1 rounded text-xs transition-colors ${
                    userHasReacted 
                      ? 'bg-blue-100 hover:bg-blue-200 border border-blue-300 text-blue-700' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title={`${reactions.length}人がリアクションしました${userHasReacted ? '（あなたを含む）' : ''}`}
                >
                  <span>{emoji}</span>
                  <span className="ml-1">{reactions.length}</span>
                </button>
              );
            });
          })()}
        </div>
      )}

      {/* Thread reply count */}
      {message.reply_count !== undefined && message.reply_count > 0 && (
        <div className="ml-11 mt-2">
          <button
            onClick={() => setShowThread(true)}
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
          >
            <span>💬</span>
            <span>{message.reply_count}件の返信</span>
            <span className="text-gray-500">スレッドを表示</span>
          </button>
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