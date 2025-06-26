import React, { useState, useEffect } from 'react';
import { Channel } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface ChannelBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelJoined: () => void;
}

export const ChannelBrowser: React.FC<ChannelBrowserProps> = ({
  isOpen,
  onClose,
  onChannelJoined
}) => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [joinedChannels, setJoinedChannels] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadAllChannels();
    }
  }, [isOpen]);

  const loadAllChannels = async () => {
    setLoading(true);
    try {
      // ユーザーが参加しているチャンネルを取得
      const userChannels = await apiService.getChannels();
      const userChannelIds = new Set(userChannels.map(c => c.id));
      setJoinedChannels(userChannelIds);

      // 全てのパブリックチャンネルを取得
      const allPublicChannels = await apiService.getAllPublicChannels();
      setChannels(allPublicChannels);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChannel = async (channelId: number) => {
    setActionLoading(prev => new Set(prev).add(channelId));
    try {
      await apiService.joinChannel(channelId);
      setJoinedChannels(prev => new Set(prev).add(channelId));
      onChannelJoined();
    } catch (error) {
      console.error('Failed to join channel:', error);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(channelId);
        return newSet;
      });
    }
  };

  const handleLeaveChannel = async (channelId: number) => {
    setActionLoading(prev => new Set(prev).add(channelId));
    try {
      await apiService.leaveChannel(channelId);
      setJoinedChannels(prev => {
        const newSet = new Set(prev);
        newSet.delete(channelId);
        return newSet;
      });
      onChannelJoined();
    } catch (error) {
      console.error('Failed to leave channel:', error);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(channelId);
        return newSet;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">チャンネルを参照</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">チャンネルを読み込み中...</div>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {channels.filter(c => c.channel_type === 'public').map((channel) => {
              const isJoined = joinedChannels.has(channel.id);
              const isLoading = actionLoading.has(channel.id);
              
              return (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        # {channel.name}
                      </span>
                      {isJoined && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          参加済み
                        </span>
                      )}
                    </div>
                    {channel.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {channel.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    {isJoined ? (
                      <button
                        onClick={() => handleLeaveChannel(channel.id)}
                        disabled={isLoading}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? '退出中...' : '退出'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinChannel(channel.id)}
                        disabled={isLoading}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? '参加中...' : '参加'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            
            {channels.filter(c => c.channel_type === 'public').length === 0 && (
              <div className="text-center py-8 text-gray-500">
                参加可能なパブリックチャンネルがありません
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};