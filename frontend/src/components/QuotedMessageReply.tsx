import { MessageResponse } from '../types';

interface QuotedMessageReplyProps {
  quotedMessage: MessageResponse['reply_to'];
  className?: string;
}

export function QuotedMessageReply({ quotedMessage, className = '' }: QuotedMessageReplyProps) {
  if (!quotedMessage) return null;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`border-l-4 border-blue-500 bg-gray-50 dark:bg-gray-800 p-3 rounded-r-md mb-2 ${className}`}>
      <div className="flex items-center text-xs mb-1">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {quotedMessage.sender?.display_name || quotedMessage.sender?.username || 'Unknown User'}
        </span>
        <span className="mx-1 text-gray-500 dark:text-gray-400">•</span>
        <span className="text-gray-500 dark:text-gray-400">{formatTime(quotedMessage.created_at)}</span>
      </div>
      <div className="text-sm text-gray-800 dark:text-gray-100 line-clamp-3">
        {quotedMessage.content}
      </div>
    </div>
  );
}