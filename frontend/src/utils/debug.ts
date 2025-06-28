// デバッグユーティリティ
import { websocketService } from '../services/websocket';

interface DebugInfo {
  websocket: {
    isConnected: boolean;
    readyState: number;
    readyStateText: string;
    userId: string | null;
    url: string | undefined;
    handlersCount: number;
    lastMessages: any[];
  };
  localStorage: {
    token: string | null;
    hasToken: boolean;
  };
  environment: {
    userAgent: string;
    location: string;
    timestamp: string;
  };
}

export class DebugManager {
  private static instance: DebugManager;
  private recentLogs: any[] = [];
  private maxLogs = 50;

  static getInstance(): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager();
    }
    return DebugManager.instance;
  }

  // ログを内部的に蓄積
  addLog(type: string, data: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      data
    };
    
    this.recentLogs.push(logEntry);
    
    // 最大ログ数を超えたら古いものを削除
    if (this.recentLogs.length > this.maxLogs) {
      this.recentLogs = this.recentLogs.slice(-this.maxLogs);
    }
  }

  // デバッグ情報を取得
  getDebugInfo(): DebugInfo {
    const ws = (window as any).websocketService?.ws;
    
    return {
      websocket: {
        isConnected: websocketService.isConnected(),
        readyState: ws?.readyState || -1,
        readyStateText: this.getReadyStateText(ws?.readyState),
        userId: (window as any).websocketService?.userId || null,
        url: ws?.url,
        handlersCount: (window as any).websocketService?.messageHandlers?.length || 0,
        lastMessages: this.recentLogs.filter(log => log.type === 'websocket_message').slice(-10)
      },
      localStorage: {
        token: localStorage.getItem('token'),
        hasToken: !!localStorage.getItem('token')
      },
      environment: {
        userAgent: navigator.userAgent,
        location: window.location.href,
        timestamp: new Date().toISOString()
      }
    };
  }

  // デバッグ情報をコンソールに出力
  dumpDebugInfo(): void {
    const info = this.getDebugInfo();
    
    console.group('🔍 Debug Information');
    console.log('📡 WebSocket Status:', info.websocket);
    console.log('💾 LocalStorage:', info.localStorage);
    console.log('🌐 Environment:', info.environment);
    console.log('📋 Recent Logs:', this.recentLogs);
    console.groupEnd();
    
    return info;
  }

  // WebSocketの詳細診断
  diagnoseWebSocket(): void {
    const info = this.getDebugInfo();
    
    console.group('🔧 WebSocket Diagnosis');
    
    if (!info.websocket.isConnected) {
      console.warn('❌ WebSocket is not connected');
    } else {
      console.log('✅ WebSocket is connected');
    }
    
    if (info.websocket.handlersCount === 0) {
      console.warn('⚠️ No message handlers registered');
    } else {
      console.log(`✅ ${info.websocket.handlersCount} handlers registered`);
    }
    
    const recentMessages = this.recentLogs.filter(log => 
      log.type === 'websocket_message' && 
      Date.now() - new Date(log.timestamp).getTime() < 30000
    );
    
    if (recentMessages.length === 0) {
      console.warn('⚠️ No WebSocket messages received in last 30 seconds');
    } else {
      console.log(`✅ ${recentMessages.length} messages received in last 30 seconds`);
    }
    
    console.groupEnd();
  }

  private getReadyStateText(readyState: number): string {
    switch (readyState) {
      case 0: return 'CONNECTING';
      case 1: return 'OPEN';
      case 2: return 'CLOSING';
      case 3: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  // 最近のログを取得
  getRecentLogs(): any[] {
    return this.recentLogs;
  }

  // グローバルに公開
  exposeToWindow(): void {
    (window as any).debugSlackClone = {
      dump: () => this.dumpDebugInfo(),
      diagnose: () => this.diagnoseWebSocket(),
      logs: () => this.recentLogs
    };
  }
}

// シングルトンインスタンス
export const debugManager = DebugManager.getInstance();