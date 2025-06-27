import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import FileUpload from './FileUpload';
import EmojiPicker from './EmojiPicker';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  placeholder?: string;
  onTyping?: (isTyping: boolean) => void;
}

export default function MessageInput({ onSendMessage, placeholder = "メッセージを入力...", onTyping }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleInputChange = (value: string) => {
    setMessage(value);
    
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

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
            value={message}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
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
    </div>
  );
}