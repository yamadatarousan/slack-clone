import { Message, User } from '../types';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: Message[];
  currentUser: User | null;
  onReactionAdded?: () => void;
}

export default function MessageList({ messages, currentUser, onReactionAdded }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg">このチャンネルにはまだメッセージがありません</p>
          <p className="text-sm mt-1">最初のメッセージを送信してみましょう！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {messages.map((message, index) => {
        const previousMessage = index > 0 ? messages[index - 1] : null;
        const showHeader = !previousMessage || 
          previousMessage.user_id !== message.user_id ||
          (new Date(message.created_at).getTime() - new Date(previousMessage.created_at).getTime()) > 300000; // 5 minutes

        return (
          <MessageItem
            key={message.id}
            message={message}
            showHeader={showHeader}
            isOwn={currentUser?.id === message.user_id}
            onReactionAdded={onReactionAdded}
          />
        );
      })}
    </div>
  );
}