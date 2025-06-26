import { useState, useEffect } from 'react';
import { Channel } from '../types';
import { apiService } from '../services/api';
import { CreateChannelModal } from './CreateChannelModal';
import { ChannelBrowser } from './ChannelBrowser';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  selectedChannelId?: number;
  onChannelSelect?: (channel: Channel) => void;
}

export default function Sidebar({ selectedChannelId, onChannelSelect }: SidebarProps) {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChannelBrowser, setShowChannelBrowser] = useState(false);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const channelsData = await apiService.getChannels();
      setChannels(channelsData);
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

  return (
    <div className="h-full flex flex-col">
      {/* Workspace header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Slack Clone</h2>
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