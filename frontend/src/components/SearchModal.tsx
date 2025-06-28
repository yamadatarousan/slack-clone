import { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { apiService } from '../services/api';
import MessageItem from './MessageItem';
import { useAuth } from '../hooks/useAuth';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId?: number;
  channelName?: string;
  onMessageNavigate?: (messageId: number, channelId: number) => void;
}

export default function SearchModal({ isOpen, onClose, channelId, channelName, onMessageNavigate }: SearchModalProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    // Clear timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    
    try {
      const searchResults = await apiService.searchMessages(searchQuery, channelId);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      performSearch(query);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleMessageClick = (messageId: number, messageChannelId: number) => {
    if (onMessageNavigate) {
      onMessageNavigate(messageId, messageChannelId);
    }
    onClose();
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {channelName ? `#${channelName} で検索` : 'メッセージを検索'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ✕
            </button>
          </div>
          
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref={searchInputRef}
              type="text"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="メッセージを検索..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          
          {query.trim().length > 0 && query.trim().length < 2 && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              検索するには最低2文字以上入力してください
            </p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-600 dark:text-gray-400">検索中...</div>
            </div>
          ) : hasSearched ? (
            results.length > 0 ? (
              <div className="p-4 space-y-4">
                {results.map((message) => (
                  <div 
                    key={message.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => handleMessageClick(message.id, message.channel_id)}
                  >
                    <MessageItem
                      message={message}
                      showHeader={true}
                      isOwn={user?.id === message.user_id}
                      onReactionAdded={() => {}}
                    />
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      チャンネル: #{message.channel_id} • {new Date(message.created_at).toLocaleString('ja-JP')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <div className="text-center text-gray-600 dark:text-gray-400">
                  <p className="text-lg mb-2">検索結果が見つかりませんでした</p>
                  <p className="text-sm">別のキーワードで検索してみてください</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-32">
              <div className="text-center text-gray-600 dark:text-gray-400">
                <p className="text-lg mb-2">🔍</p>
                <p className="text-sm">キーワードを入力してメッセージを検索</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div>
              {results.length > 0 && `${results.length}件の結果`}
            </div>
            <div className="flex items-center space-x-4">
              <span>Enter で検索</span>
              <span>Esc で閉じる</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}