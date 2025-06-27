import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import FileUpload from './FileUpload';
import EmojiPicker from './EmojiPicker';
import MentionInput from './MentionInput';

interface User {
  id: number;
  username: string;
  display_name?: string;
}

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  placeholder?: string;
  onTyping?: (isTyping: boolean) => void;
  channelUsers?: User[];
}

export default function MessageInput({ onSendMessage, placeholder = "メッセージを入力...", onTyping, channelUsers = [] }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage) {
      console.log('MessageInput: Sending message:', trimmedMessage);
      onSendMessage(trimmedMessage);
      setMessage('');
      // Stop typing indicator when message is sent
      if (isTyping) {
        setIsTyping(false);
        onTyping?.(false);
      }
    }
  };

  const handleInputChange = (value: string, selectionStart?: number) => {
    setMessage(value);
    
    // Update cursor position
    const cursor = selectionStart ?? textareaRef.current?.selectionStart ?? value.length;
    setCursorPosition(cursor);
    
    // Check for mention trigger
    checkMentionTrigger(value, cursor);
    
    // Handle typing indicator
    if (onTyping) {
      if (value.trim() && !isTyping) {
        setIsTyping(true);
        onTyping(true);
      }
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing indicator after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false);
          onTyping(false);
        }
      }, 3000);
    }
  };

  const checkMentionTrigger = (text: string, cursor: number) => {
    // Look for @ symbol before cursor
    const textBeforeCursor = text.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentions(true);
      
      // Calculate position for mention dropdown
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const rect = textarea.getBoundingClientRect();
        
        // Simple positioning - in a real app you'd calculate exact text position
        setMentionPosition({
          top: rect.top - 200, // Position above textarea
          left: rect.left + 20,
        });
      }
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const handleMentionSelect = (user: User) => {
    const textBeforeCursor = message.slice(0, cursorPosition);
    const textAfterCursor = message.slice(cursorPosition);
    
    // Find the @ symbol and replace the mention
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
      const mention = `@${user.display_name || user.username}`;
      const newText = beforeMention + mention + ' ' + textAfterCursor;
      
      setMessage(newText);
      setShowMentions(false);
      setMentionQuery('');
      
      // Focus back to textarea
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = beforeMention.length + mention.length + 1;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Let MentionInput handle navigation when visible
    if (showMentions && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
      if (e.key === 'Escape') {
        setShowMentions(false);
        setMentionQuery('');
      }
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e.target.value, e.target.selectionStart);
  };

  const handleTextareaKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.target instanceof HTMLTextAreaElement) {
      setCursorPosition(e.target.selectionStart);
      checkMentionTrigger(message, e.target.selectionStart);
    }
  };

  const handleFileUploaded = (fileUrl: string, fileName: string) => {
    const fileMessage = `📎 ${fileName}\n${fileUrl}`;
    onSendMessage(fileMessage);
    setShowFileUpload(false);
    setError(null);
  };

  const handleFileError = (errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const getEmojiPickerPosition = () => {
    if (emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      return {
        bottom: window.innerHeight - rect.top + 5,
        left: rect.left,
      };
    }
    return { bottom: 100, left: 0 };
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}
      
      {showFileUpload && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ファイルをアップロード</span>
            <button
              onClick={() => setShowFileUpload(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          <FileUpload onFileUploaded={handleFileUploaded} onError={handleFileError} />
        </div>
      )}
      
      <div className="flex items-end space-x-3">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowFileUpload(!showFileUpload)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="ファイルを添付"
          >
            📎
          </button>
          <button
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="絵文字を追加"
          >
            😊
          </button>
        </div>
        
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
            onKeyUp={handleTextareaKeyUp}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            rows={1}
            style={{
              minHeight: '2.5rem',
              maxHeight: '150px',
              height: 'auto',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
            }}
          />
        </div>
        
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="bg-blue-600 text-white rounded-md px-6 py-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          送信
        </button>
      </div>
      
      <EmojiPicker
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
        position={getEmojiPickerPosition()}
      />
      
      <MentionInput
        users={channelUsers}
        onMention={handleMentionSelect}
        isVisible={showMentions}
        position={mentionPosition}
        query={mentionQuery}
      />
    </div>
  );
}