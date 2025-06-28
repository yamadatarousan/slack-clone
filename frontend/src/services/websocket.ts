import { WebSocketMessage } from '../types';
import { debugManager } from '../utils/debug';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private messageHandlers: ((message: WebSocketMessage) => void)[] = [];
  private processedMessages = new Set<string>();

  connect(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Close existing connection if any
      if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
        console.log('🔌 Closing existing WebSocket connection...');
        this.ws.close(1000, 'Reconnecting');
      }
      
      // Add browser event listeners to handle page unload
      this.setupPageUnloadHandlers();
      
      this.userId = userId;
      // デバッグ用にグローバルに保存
      (window as any).websocketService = this;
      
      const wsUrl = `ws://localhost:8000/ws/${userId}`;
      console.log('🔌 Connecting WebSocket:', { userId, wsUrl });
      
      try {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            
            // デバッグログに記録（常時コンソール出力はしない）
            debugManager.addLog('websocket_message', {
              rawData: event.data,
              parsedMessage: message,
              handlersCount: this.messageHandlers.length,
              messageType: message.type
            });
            
            // Create unique message ID for deduplication
            const messageId = `${message.type}-${message.user_id}-${message.channel_id || 'none'}-${message.timestamp || Date.now()}-${JSON.stringify(message).slice(0, 50)}`;
            
            // デバッグログに記録
            debugManager.addLog('websocket_processing', {
              messageId,
              processedCount: this.processedMessages.size
            });
            
            // Check for duplicate messages
            if (this.processedMessages.has(messageId)) {
              debugManager.addLog('websocket_duplicate', { messageId });
              return;
            }
            
            // Mark message as processed
            this.processedMessages.add(messageId);
            
            // Clean up old message IDs (keep only last 50)
            if (this.processedMessages.size > 50) {
              const idsArray = Array.from(this.processedMessages);
              this.processedMessages = new Set(idsArray.slice(-25));
            }
            
            // ハンドラーを呼び出し
            if (this.messageHandlers.length > 0) {
              this.messageHandlers.forEach((handler, index) => {
                try {
                  handler(message);
                  debugManager.addLog('handler_success', { index, messageType: message.type });
                } catch (error) {
                  debugManager.addLog('handler_error', { index, error: error.message, messageType: message.type });
                }
              });
            } else {
              debugManager.addLog('no_handlers', { messageType: message.type });
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error event:', {
            error,
            readyState: this.ws?.readyState,
            userId: this.userId,
            url: this.ws?.url,
            timestamp: new Date().toISOString()
          });
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private reconnect(): void {
    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.userId) {
        console.log(`🔌 Reconnecting for user ${this.userId}...`);
        this.connect(this.userId)
          .then(() => {
            console.log('✅ Reconnection successful');
          })
          .catch(error => {
            console.error('❌ Reconnection failed:', error);
          });
      }
    }, this.reconnectInterval * Math.min(this.reconnectAttempts, 5)); // Cap the delay
  }

  sendMessage(message: WebSocketMessage): void {
    console.log('📤 Attempting to send WebSocket message:', message);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket is open, sending message');
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('❌ WebSocket is not connected. State:', this.ws?.readyState);
      console.error('WebSocket states: CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3');
    }
  }

  sendChatMessage(content: string, channelId: string): void {
    this.sendMessage({
      type: 'message',
      content,
      channel_id: channelId,
    });
  }

  sendTypingIndicator(channelId: string, isTyping: boolean): void {
    this.sendMessage({
      type: 'typing',
      channel_id: channelId,
      is_typing: isTyping,
    });
  }

  onMessage(handler: (message: WebSocketMessage) => void): () => void {
    console.log('📝 Registering message handler. Total handlers before:', this.messageHandlers.length);
    this.messageHandlers.push(handler);
    console.log('📝 Message handler registered. Total handlers after:', this.messageHandlers.length);
    
    // Return unsubscribe function
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        console.log('📝 Unregistering message handler. Total handlers before:', this.messageHandlers.length);
        this.messageHandlers.splice(index, 1);
        console.log('📝 Message handler unregistered. Total handlers after:', this.messageHandlers.length);
      } else {
        console.warn('⚠️ Attempted to unregister handler that was not found');
      }
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.userId = null;
    this.reconnectAttempts = 0;
    this.messageHandlers = [];
    this.processedMessages.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private setupPageUnloadHandlers(): void {
    // Remove existing listeners to avoid duplicates
    window.removeEventListener('beforeunload', this.handlePageUnload);
    window.removeEventListener('unload', this.handlePageUnload);
    
    // Add new listeners
    window.addEventListener('beforeunload', this.handlePageUnload);
    window.addEventListener('unload', this.handlePageUnload);
    
    // Also handle visibility change (when tab becomes hidden)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handlePageUnload = () => {
    console.log('🔴 Page unload detected, closing WebSocket');
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Close immediately without waiting
      this.ws.close(1000, 'Page unload');
    }
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      console.log('🔴 Tab hidden, ensuring WebSocket will close properly');
      // Don't close immediately on visibility change, but ensure it's ready to close
      if (this.ws) {
        this.ws.onbeforeunload = () => {
          this.ws?.close(1000, 'Tab hidden');
        };
      }
    }
  };
}

export const websocketService = new WebSocketService();