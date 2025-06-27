import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import MessageSearch from './MessageSearch';
import NotificationSettings from './NotificationSettings';
import EmojiManager from './EmojiManager';

interface HeaderProps {
  channels?: any[];
}

export default function Header({ channels = [] }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showSearch, setShowSearch] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showEmojiManager, setShowEmojiManager] = useState(false);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Slack Clone</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="メッセージを検索"
          >
            🔍
          </button>
          <button
            onClick={() => setShowNotificationSettings(true)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="通知設定"
          >
            🔔
          </button>
          <button
            onClick={() => setShowEmojiManager(true)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="絵文字管理"
          >
            🎨
          </button>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {user?.display_name?.[0] || user?.username?.[0] || 'U'}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {user?.display_name || user?.username}
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>
      
      <MessageSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        channels={channels}
      />
      
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />
      
      <EmojiManager
        isOpen={showEmojiManager}
        onClose={() => setShowEmojiManager(false)}
      />
    </header>
  );
}