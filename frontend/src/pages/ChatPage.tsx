import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatRoom from '../components/ChatRoom';
import Header from '../components/Header';
import { Channel } from '../types';
import { apiService } from '../services/api';

export default function ChatPage() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const channelsData = await apiService.getChannels();
      setChannels(channelsData);
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  return (
    <div className="h-screen flex">
      <div className="w-64 bg-gray-800 dark:bg-gray-900 text-white flex-shrink-0">
        <Sidebar
          selectedChannelId={selectedChannel?.id}
          onChannelSelect={setSelectedChannel}
        />
      </div>
      <div className="flex-1 flex flex-col">
        <Header channels={channels} />
        <div className="flex-1">
          {selectedChannel ? (
            <ChatRoom channel={selectedChannel} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <h2 className="text-xl font-medium mb-2">チャンネルを選択してください</h2>
                <p className="text-sm">左のサイドバーからチャンネルを選択してチャットを開始できます。</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}