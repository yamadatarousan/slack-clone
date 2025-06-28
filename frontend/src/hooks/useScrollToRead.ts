import { useEffect, useRef, useCallback } from 'react';
import { Message } from '../types';
import { apiService } from '../services/api';

interface UseScrollToReadProps {
  messages: Message[];
  channelId: number;
  onReadUpdate?: () => void;
}

export function useScrollToRead({ messages, channelId, onReadUpdate }: UseScrollToReadProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastReadMessageRef = useRef<number | null>(null);
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const markAsRead = useCallback(async (messageId: number) => {
    if (lastReadMessageRef.current === messageId) return;
    
    try {
      lastReadMessageRef.current = messageId;
      await apiService.markChannelAsRead(channelId);
      onReadUpdate?.();
      console.log(`Marked channel ${channelId} as read up to message ${messageId}`);
    } catch (error) {
      console.error('Failed to mark channel as read:', error);
    }
  }, [channelId, onReadUpdate]);

  const debouncedMarkAsRead = useCallback((messageId: number) => {
    // Clear previous timeout
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }
    
    // Set new timeout to debounce rapid scroll events
    markAsReadTimeoutRef.current = setTimeout(() => {
      markAsRead(messageId);
    }, 1000); // 1 second delay
  }, [markAsRead]);

  const createMessageObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the lowest (most recent) message that is visible
        let latestVisibleMessageId: number | null = null;
        
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageElement = entry.target as HTMLElement;
            const messageId = parseInt(messageElement.dataset.messageId || '0', 10);
            
            if (messageId > 0 && (!latestVisibleMessageId || messageId > latestVisibleMessageId)) {
              latestVisibleMessageId = messageId;
            }
          }
        });

        if (latestVisibleMessageId) {
          debouncedMarkAsRead(latestVisibleMessageId);
        }
      },
      {
        // Trigger when 50% of the message is visible
        threshold: 0.5,
        // Add some margin to trigger slightly before the message is fully visible
        rootMargin: '0px 0px -10% 0px'
      }
    );
  }, [debouncedMarkAsRead]);

  const observeMessage = useCallback((element: HTMLElement | null, messageId: number) => {
    if (!element || !observerRef.current) return;
    
    element.dataset.messageId = messageId.toString();
    observerRef.current.observe(element);
  }, []);

  // Initialize observer when messages change
  useEffect(() => {
    if (messages.length > 0) {
      createMessageObserver();
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }
    };
  }, [messages, createMessageObserver]);

  // Reset when channel changes
  useEffect(() => {
    lastReadMessageRef.current = null;
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
      markAsReadTimeoutRef.current = null;
    }
  }, [channelId]);

  return { observeMessage };
}