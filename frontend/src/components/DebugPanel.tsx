import React, { useState } from 'react';
import { debugManager } from '../utils/debug';

export default function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const handleDump = () => {
    const info = debugManager.getDebugInfo();
    setDebugInfo(info);
    console.log('🔍 Debug Information:', info);
  };

  const handleDiagnose = () => {
    debugManager.diagnoseWebSocket();
  };

  const handleShowLogs = () => {
    const logs = debugManager.getRecentLogs();
    console.log('📋 Recent Logs:', logs);
  };

  // 開発環境でのみ表示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* デバッグボタン（常時表示） */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="bg-red-600 text-white px-3 py-2 rounded-full text-sm shadow-lg hover:bg-red-700"
          title="デバッグパネルを開く"
        >
          🔧 DEBUG
        </button>
      </div>

      {/* デバッグパネル */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 z-50 w-80">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Debug Panel</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={handleDump}
              className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
            >
              📊 Debug Info Dump
            </button>
            
            <button
              onClick={handleDiagnose}
              className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
            >
              🔧 WebSocket Diagnose
            </button>
            
            <button
              onClick={handleShowLogs}
              className="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700"
            >
              📋 Show Recent Logs
            </button>
          </div>

          {debugInfo && (
            <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              <div className="text-green-600 dark:text-green-400">
                ✅ Debug info logged to console
              </div>
              <div className="text-gray-600 dark:text-gray-300 mt-1">
                WebSocket: {debugInfo.websocket.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Handlers: {debugInfo.websocket.handlersCount}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}