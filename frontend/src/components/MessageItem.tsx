import { Message } from '../types';

interface MessageItemProps {
  message: Message;
  showHeader: boolean;
  isOwn: boolean;
}

export default function MessageItem({ message, showHeader, isOwn }: MessageItemProps) {
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
    // Log for debugging
    console.log('Message without sender:', message);
    return `User ${message.user_id || message.sender_id}`;
  };

  const getAvatarInitial = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={`group ${isOwn ? 'ml-12' : ''}`}>
      {showHeader ? (
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
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
            <div className="mt-1">
              <p className="text-gray-900 whitespace-pre-wrap break-words">
                {message.content}
              </p>
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
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
        </div>
      )}
      
      {/* Reactions placeholder */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="ml-11 mt-1 flex flex-wrap gap-1">
          {message.reactions.map((reaction) => (
            <button
              key={reaction.id}
              className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <span>{reaction.emoji}</span>
              <span className="ml-1 text-gray-600">1</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}