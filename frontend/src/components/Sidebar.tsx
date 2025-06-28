import { useState, useEffect } from 'react';
import { Channel } from '../types';
import { apiService } from '../services/api';
import { CreateChannelModal } from './CreateChannelModal';
import { ChannelBrowser } from './ChannelBrowser';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';

interface SidebarProps {
  selectedChannelId?: number;
  onChannelSelect?: (channel: Channel) => void;
}

export default function Sidebar({ selectedChannelId, onChannelSelect }: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { onlineUsers, getOnlineCount, isUserOnline } = useOnlineStatus();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChannelBrowser, setShowChannelBrowser] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const channelsData = await apiService.getChannels();
      console.log('Loaded channels:', channelsData);
      
      // Remove duplicates based on channel ID to prevent display issues
      const uniqueChannels = channelsData.filter((channel, index, self) => 
        index === self.findIndex(c => c.id === channel.id)
      );
      
      if (channelsData.length !== uniqueChannels.length) {
        console.warn(`Removed ${channelsData.length - uniqueChannels.length} duplicate channels`);
      }
      
      setChannels(uniqueChannels);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">Loading channels...</div>
      </div>
    );
  }

  const getStatusColor = (status: string, isOnline: boolean) => {
    if (!isOnline) return 'bg-gray-400';
    switch (status) {
      case 'active': return 'bg-green-400';
      case 'away': return 'bg-yellow-400';
      case 'busy': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string, isOnline: boolean) => {
    if (!isOnline) return 'オフライン';
    switch (status) {
      case 'active': return 'アクティブ';
      case 'away': return '離席中';
      case 'busy': return '取り込み中';
      default: return 'オフライン';
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await apiService.updateUserStatus(newStatus, true);
      // ユーザー情報を再読み込み（実際の実装では状態管理を使用）
      window.location.reload();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
    setShowStatusMenu(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Workspace header */}
      <div className="p-4 border-b border-gray-700 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Slack Clone</h2>
            <div className="flex items-center space-x-1 text-sm text-gray-300">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>{getOnlineCount()} online</span>
              <span className="text-xs text-gray-400">
                ({Array.from(onlineUsers.values()).filter(u => u.is_online).map(u => u.username).join(', ')})
              </span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-1 rounded text-gray-300 hover:text-white transition-colors"
            title={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
        {user && (
          <div className="mt-3 relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="w-full flex items-center space-x-2 hover:bg-gray-700 rounded p-1 transition-colors"
            >
              <div className="relative">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user.display_name?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-800 ${getStatusColor(user.status || 'active', user.is_online)}`}></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.display_name || user.username}
                </p>
                <p className="text-xs text-gray-400">
                  {getStatusText(user.status || 'active', user.is_online)}
                </p>
              </div>
            </button>
            
            {showStatusMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 z-10">
                <button
                  onClick={() => handleStatusChange('active')}
                  className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-2"
                >
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span>アクティブ</span>
                </button>
                <button
                  onClick={() => handleStatusChange('away')}
                  className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-2"
                >
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span>離席中</span>
                </button>
                <button
                  onClick={() => handleStatusChange('busy')}
                  className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-2"
                >
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span>取り込み中</span>
                </button>
                <hr className="border-gray-300 dark:border-gray-600" />
                <button
                  onClick={logout}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-2 text-red-600 dark:text-red-400"
                >
                  <span>ログアウト</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Channels list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 px-2">チャンネル</h3>
            <div className="space-y-1">
              {channels.filter(c => c.channel_type === 'public').map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onChannelSelect?.(channel)}
                  className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                    selectedChannelId === channel.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  # {channel.name}
                </button>
              ))}
            </div>
          </div>
          
          {channels.some(c => c.channel_type === 'private') && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2 px-2">プライベートチャンネル</h3>
              <div className="space-y-1">
                {channels.filter(c => c.channel_type === 'private').map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => onChannelSelect?.(channel)}
                    className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                      selectedChannelId === channel.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    🔒 {channel.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {channels.some(c => c.channel_type === 'dm') && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2 px-2">ダイレクトメッセージ</h3>
              <div className="space-y-1">
                {channels.filter(c => c.channel_type === 'dm').map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => onChannelSelect?.(channel)}
                    className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                      selectedChannelId === channel.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    💬 {channel.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Add channel button */}
      <div className="p-4 border-t border-gray-700 space-y-2">
        <button 
          onClick={() => setShowCreateModal(true)}
          className="w-full text-left text-gray-300 hover:text-white text-sm transition-colors"
        >
          + チャンネルを追加
        </button>
        <button 
          onClick={() => setShowChannelBrowser(true)}
          className="w-full text-left text-gray-300 hover:text-white text-sm transition-colors"
        >
          📋 チャンネルを参照
        </button>
      </div>

      <CreateChannelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onChannelCreated={loadChannels}
      />

      <ChannelBrowser
        isOpen={showChannelBrowser}
        onClose={() => setShowChannelBrowser(false)}
        onChannelJoined={loadChannels}
      />
    </div>
  );
}