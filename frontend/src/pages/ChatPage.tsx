import { useState } from 'react';
import Layout from '../components/Layout';
import Sidebar from '../components/Sidebar';
import ChatRoom from '../components/ChatRoom';
import { Channel } from '../types';

export default function ChatPage() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  return (
    <Layout>
      <div className="h-full flex">
        <div className="w-64 bg-gray-800 text-white flex-shrink-0">
          <Sidebar
            selectedChannelId={selectedChannel?.id}
            onChannelSelect={setSelectedChannel}
          />
        </div>
        <div className="flex-1">
          {selectedChannel ? (
            <ChatRoom channel={selectedChannel} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <h2 className="text-xl font-medium mb-2">チャンネルを選択してください</h2>
                <p className="text-sm">左のサイドバーからチャンネルを選択してチャットを開始できます。</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}