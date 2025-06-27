import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  createdAt: Date;
  autoHide?: boolean;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  requestPermission: () => Promise<boolean>;
  showBrowserNotification: (title: string, message: string, options?: NotificationOptions) => void;
  playNotificationSound: (isMention?: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const recentNotifications = useRef<Set<string>>(new Set());

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    // Create unique notification ID to prevent duplicates
    const notificationContent = `${notification.title}-${notification.message}`;
    
    // Check if we already have this notification recently
    const hasDuplicate = notifications.some(existing => 
      existing.title === notification.title && 
      existing.message === notification.message &&
      Date.now() - existing.createdAt.getTime() < 2000 // Within 2 seconds
    );
    
    if (hasDuplicate) {
      console.log('🔄 In-app notification: Skipping duplicate:', notificationContent);
      return;
    }
    
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: new Date(),
    };

    console.log('📢 Adding in-app notification:', newNotification);
    setNotifications(prev => [newNotification, ...prev]);

    // Auto-hide notification if specified
    if (notification.autoHide !== false) {
      const duration = notification.duration || 5000;
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (permission === 'granted') {
      return true;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  };

  const showBrowserNotification = (title: string, message: string, options?: NotificationOptions) => {
    console.log('🔔 Attempting to show browser notification:', { title, message, permission });
    
    // Create unique notification ID to prevent duplicates
    const notificationId = `${title}-${message}-${Date.now()}`;
    const shortId = notificationId.slice(0, 100); // Truncate for performance
    
    // Check if we've shown this notification recently (within 1 second)
    if (recentNotifications.current.has(shortId)) {
      console.log('🔄 Notification: Skipping duplicate notification:', shortId);
      return;
    }
    
    // Mark notification as shown
    recentNotifications.current.add(shortId);
    
    // Remove from recent notifications after 2 seconds
    setTimeout(() => {
      recentNotifications.current.delete(shortId);
    }, 2000);
    
    // Clean up old notifications (keep only last 10)
    if (recentNotifications.current.size > 10) {
      const idsArray = Array.from(recentNotifications.current);
      recentNotifications.current = new Set(idsArray.slice(-5));
    }
    
    if (!('Notification' in window)) {
      console.warn('このブラウザは通知をサポートしていません');
      return;
    }
    
    if (permission === 'granted') {
      console.log('✅ Showing browser notification');
      const notification = new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        ...options,
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      console.log('Notification created:', notification);
    } else {
      console.warn('⚠️ 通知許可が必要です。現在の状態:', permission);
    }
  };

  const playNotificationSound = (isMention = false) => {
    console.log('🔊 Attempting to play notification sound:', { isMention });
    try {
      // Check notification settings
      const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
      console.log('Sound settings:', settings);
      if (settings.soundEnabled === false) {
        console.log('Sound disabled in settings');
        return;
      }

      // Create audio context for notification sounds
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (isMention) {
        console.log('🎵 Playing mention sound');
        // Play a more prominent sound for mentions (higher pitch, longer)
        playTone(audioContext, 800, 0.3, 0.2); // 800Hz, 0.3s duration, 0.2 volume
        setTimeout(() => playTone(audioContext, 600, 0.2, 0.15), 200);
      } else {
        console.log('🎵 Playing regular message sound');
        // Play a subtle sound for regular messages
        playTone(audioContext, 400, 0.15, 0.1); // 400Hz, 0.15s duration, 0.1 volume
      }
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  const playTone = (audioContext: AudioContext, frequency: number, duration: number, volume: number) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll,
      requestPermission,
      showBrowserNotification,
      playNotificationSound,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}