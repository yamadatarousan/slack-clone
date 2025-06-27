import { useState, useEffect } from 'react';
import { Message, Channel } from '../types';
import { apiService } from '../services/api';
import MessageItem from './MessageItem';

interface MessageSearchProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
}

export default function MessageSearch({ isOpen, onClose, channels }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);

  useEffect(() => {
    if (query.trim() && query.length >= 2) {
      const debounceTimer = setTimeout(() => {
        searchMessages();
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setResults([]);
    }
  }, [query, selectedChannel]);

  const searchMessages = async () => {
    try {
      setLoading(true);
      const searchResults = await apiService.searchMessages(query, selectedChannel);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getChannelName = (channelId: number) => {
    const channel = channels.find(c => c.id === channelId);
    return channel ? channel.name : `チャンネル${channelId}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            メッセージ検索
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Search Form */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="メッセージを検索..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                autoFocus
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                チャンネル:
              </label>
              <select
                value={selectedChannel || ''}
                onChange={(e) => setSelectedChannel(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">全てのチャンネル</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.channel_type === 'private' ? '🔒' : '#'} {channel.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">検索中...</span>
            </div>
          ) : query.trim().length < 2 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>2文字以上入力して検索してください</p>
            </div>
          ) : results.length === 0 && query.trim().length >= 2 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>「{query}」に一致するメッセージが見つかりませんでした</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {results.length}件の結果が見つかりました
              </div>
              
              {results.map((message) => (
                <div key={message.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      #{getChannelName(message.channel_id)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(message.created_at).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  
                  <MessageItem
                    message={message}
                    showHeader={true}
                    isOwn={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}