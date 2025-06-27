import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import MessageSearch from './MessageSearch';
import NotificationSettings from './NotificationSettings';
import EmojiManager from './EmojiManager';

interface HeaderProps {
  channels?: any[];
}

export default function Header({ channels = [] }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showBrowserNotification, playNotificationSound, requestPermission } = useNotifications();
  const [showSearch, setShowSearch] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showEmojiManager, setShowEmojiManager] = useState(false);

  const testNotification = async () => {
    console.log('🧪 Testing notification...');
    const granted = await requestPermission();
    if (granted) {
      showBrowserNotification(
        '🧪 テスト通知',
        'これはテスト通知です。メンション機能が正常に動作しています。',
        { requireInteraction: true }
      );
      playNotificationSound(true);
    } else {
      alert('通知許可が必要です。ブラウザの設定を確認してください。');
    }
  };

  const testMention = async () => {
    console.log('🧪 Testing mention notification...');
    const granted = await requestPermission();
    if (granted) {
      showBrowserNotification(
        `💬 メンション - #テストチャンネル`,
        `テストユーザー: @${user?.username || 'you'} テストメンションです！`,
        { 
          requireInteraction: true,
          tag: `mention-test-${Date.now()}`
        }
      );
      playNotificationSound(true);
    } else {
      alert('通知許可が必要です。ブラウザの設定を確認してください。');
    }
  };

  const checkConnectionStatus = () => {
    console.log('🔍 Connection Status Check:');
    console.log('Current User:', user);
    console.log('User ID:', user?.id);
    console.log('Username:', user?.username);
    console.log('Display Name:', user?.display_name);
    
    // WebSocket接続状況を確認
    const isConnected = (window as any).websocketService?.ws?.readyState === 1;
    console.log('WebSocket Status:', {
      isConnected,
      readyState: (window as any).websocketService?.ws?.readyState,
      url: (window as any).websocketService?.ws?.url,
      userId: (window as any).websocketService?.userId
    });
    
    // LocalStorageの認証情報を確認
    const token = localStorage.getItem('token');
    console.log('Auth Token:', token ? 'Present' : 'Not Found');
    
    // WebSocketのユーザーIDとログインユーザーIDが一致するか確認
    const wsUserId = (window as any).websocketService?.userId;
    const loginUserId = user?.id?.toString();
    const idsMatch = wsUserId === loginUserId;
    
    console.log('🚨 ID Comparison:', {
      wsUserId,
      loginUserId,
      idsMatch,
      wsUserIdType: typeof wsUserId,
      loginUserIdType: typeof loginUserId
    });
    
    const status = isConnected ? '接続中 ✅' : '未接続 ❌';
    const action = isConnected ? '' : '\n\n🔄ボタンで接続リセットしてください';
    const handlersCount = (window as any).websocketService?.messageHandlers?.length || 0;
    
    console.log('WebSocket detailed status:', {
      isConnected,
      wsUserId,
      loginUserId,
      idsMatch,
      handlersCount,
      readyState: (window as any).websocketService?.ws?.readyState
    });
    
    alert(`ユーザー: ${user?.username} (ID: ${user?.id})\nWebSocket: ${status}\nWS User ID: ${wsUserId}\nID一致: ${idsMatch}\nメッセージハンドラー: ${handlersCount}個${action}`);
  };

  const forceMentionTest = () => {
    console.log('🧪 Force triggering mention notification flow...');
    
    // 通知設定を確認
    const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
    console.log('Notification settings:', settings);
    
    // 強制的にメンション通知をトリガー
    const testMessage = {
      type: 'message',
      user_id: '999', // 異なるユーザーID
      channel_id: '1',
      content: `@${user?.username} これはテストメンションです！`,
      sender_name: 'TestUser',
      timestamp: Date.now()
    };
    
    // ChatRoomの通知ロジックを模擬（統一されたメンション検出を使用）
    const checkIfUserMentioned = (content: string, user: any): boolean => {
      if (!user) return false;
      
      const mentionRegex = /@(\w+|"[^"]+"|'[^']+')/g;
      let match;
      
      while ((match = mentionRegex.exec(content)) !== null) {
        let username = match[1];
        if ((username.startsWith('"') && username.endsWith('"')) || 
            (username.startsWith("'") && username.endsWith("'"))) {
          username = username.slice(1, -1);
        }
        
        if (username === user.username || 
            (user.display_name && username === user.display_name)) {
          return true;
        }
      }
      
      return false;
    };
    
    const isMentioned = user && checkIfUserMentioned(testMessage.content, user);
    
    console.log('Mention test result:', { isMentioned, content: testMessage.content, username: user?.username });
    
    if (isMentioned) {
      showBrowserNotification(
        `💬 メンション - #テストチャンネル`,
        `${testMessage.sender_name}: ${testMessage.content}`,
        { 
          requireInteraction: true,
          tag: `mention-test-${Date.now()}`
        }
      );
      playNotificationSound(true);
      alert('強制メンション通知が送信されました！');
    } else {
      alert(`メンション検出失敗: ${testMessage.content} に @${user?.username} が含まれていません`);
    }
  };

  const directNotificationTest = async () => {
    console.log('🧪 Direct notification test (bypassing all logic)...');
    
    const granted = await requestPermission();
    console.log('Permission granted:', granted);
    
    if (granted) {
      console.log('🔔 Creating direct notification...');
      try {
        const notification = new Notification('🧪 直接テスト通知', {
          body: `これは直接Notification APIを使用したテストです。ユーザー: ${user?.username}`,
          icon: '/favicon.ico',
          requireInteraction: true,
          tag: `direct-test-${Date.now()}`
        });
        
        notification.onclick = () => {
          console.log('Notification clicked');
          window.focus();
          notification.close();
        };
        
        console.log('✅ Direct notification created successfully');
        playNotificationSound(true);
      } catch (error) {
        console.error('❌ Failed to create direct notification:', error);
        alert(`直接通知作成失敗: ${error}`);
      }
    } else {
      alert('通知許可が必要です。ブラウザの設定を確認してください。');
    }
  };

  const testBackendConnection = async () => {
    console.log('🧪 Testing backend connection...');
    
    try {
      // REST API接続テスト
      const response = await fetch('http://localhost:8000/health');
      const data = await response.json();
      console.log('✅ Backend REST API:', data);
      
      // WebSocket接続テスト
      const testWs = new WebSocket(`ws://localhost:8000/ws/${user?.id}`);
      
      testWs.onopen = () => {
        console.log('✅ WebSocket test connection successful');
        testWs.close();
        alert('バックエンド接続テスト成功！\nREST API: ✅\nWebSocket: ✅');
      };
      
      testWs.onerror = (error) => {
        console.error('❌ WebSocket test connection failed:', error);
        alert('WebSocket接続失敗！\nバックエンドサーバーが起動していません。');
      };
      
      testWs.onclose = (event) => {
        console.log('WebSocket test connection closed:', event.code, event.reason);
      };
      
    } catch (error) {
      console.error('❌ Backend connection test failed:', error);
      alert(`バックエンド接続失敗: ${error.message}\n\nバックエンドサーバーが起動していることを確認してください。`);
    }
  };

  const forceWebSocketConnection = async () => {
    console.log('🔌 Force WebSocket connection...');
    
    if (!user) {
      alert('ユーザーがログインしていません');
      return;
    }

    try {
      console.log('🔌 Attempting manual WebSocket connection for user:', user.id, user.username);
      
      // WebSocketサービスを直接使用
      const { websocketService } = await import('../services/websocket');
      
      // 既存の接続を完全にクリーンアップ
      websocketService.disconnect();
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms待機
      
      await websocketService.connect(user.id.toString());
      
      console.log('✅ Manual WebSocket connection successful');
      
      // 接続状態を確認
      setTimeout(() => {
        const isConnected = websocketService.isConnected();
        console.log('📊 WebSocket state after manual connection:', {
          readyState: isConnected,
          userId: (window as any).websocketService?.userId
        });
        
        alert(`WebSocket手動接続成功！\nユーザー: ${user.username} (ID: ${user.id})\n接続状態: ${isConnected ? '接続中 ✅' : '未接続 ❌'}`);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Manual WebSocket connection failed:', error);
      alert(`WebSocket手動接続失敗: ${error.message || error}`);
    }
  };

  const resetAllConnections = async () => {
    console.log('🔄 Resetting all connections...');
    
    if (!user) {
      alert('ユーザーがログインしていません');
      return;
    }

    try {
      // WebSocketサービスを完全にリセット
      const { websocketService } = await import('../services/websocket');
      websocketService.disconnect();
      
      // 少し待ってから再接続
      await new Promise(resolve => setTimeout(resolve, 1000));
      await websocketService.connect(user.id.toString());
      
      console.log('✅ All connections reset successfully');
      alert(`接続リセット完了！\nユーザー: ${user.username} (ID: ${user.id})`);
      
    } catch (error) {
      console.error('❌ Connection reset failed:', error);
      alert(`接続リセット失敗: ${error.message || error}`);
    }
  };

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
          <button
            onClick={testNotification}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="通知テスト"
          >
            🧪
          </button>
          <button
            onClick={testMention}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="メンション通知テスト"
          >
            💬
          </button>
          <button
            onClick={checkConnectionStatus}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="接続状況確認"
          >
            🔍
          </button>
          <button
            onClick={forceMentionTest}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="強制メンションテスト"
          >
            ⚡
          </button>
          <button
            onClick={directNotificationTest}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="直接通知テスト"
          >
            🚨
          </button>
          <button
            onClick={testBackendConnection}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="バックエンド接続テスト"
          >
            🔗
          </button>
          <button
            onClick={forceWebSocketConnection}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="WebSocket強制接続"
          >
            🔌
          </button>
          <button
            onClick={resetAllConnections}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title="接続完全リセット"
          >
            🔄
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