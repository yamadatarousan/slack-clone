import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { MessageDraft } from '../types';

interface UseDraftOptions {
  channelId: number;
  autoSaveDelay?: number; // milliseconds
}

export function useDraft({ channelId, autoSaveDelay = 1000 }: UseDraftOptions) {
  const [draft, setDraft] = useState<MessageDraft | null>(null);
  const [content, setContent] = useState('');
  const [quotedMessage, setQuotedMessage] = useState<MessageDraft['reply_to'] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef('');

  // Load draft when channel changes
  useEffect(() => {
    loadDraft();
    return () => {
      // Clear any pending save when component unmounts or channel changes
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [channelId]);

  // Auto-save when content changes
  useEffect(() => {
    if (content.trim() !== lastSavedContentRef.current && content.trim() !== '') {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        saveDraft(content, quotedMessage?.id);
      }, autoSaveDelay);
    } else if (content.trim() === '' && lastSavedContentRef.current !== '') {
      // Delete draft if content is empty
      deleteDraft();
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, quotedMessage?.id, autoSaveDelay]);

  const loadDraft = useCallback(async () => {
    try {
      const draftData = await apiService.getChannelDraft(channelId);
      if (draftData) {
        setDraft(draftData);
        setContent(draftData.content);
        setQuotedMessage(draftData.reply_to || null);
        lastSavedContentRef.current = draftData.content;
        setLastSaved(new Date(draftData.updated_at));
      } else {
        setDraft(null);
        setContent('');
        setQuotedMessage(null);
        lastSavedContentRef.current = '';
        setLastSaved(null);
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, [channelId]);

  const saveDraft = useCallback(async (draftContent: string, replyToId?: number) => {
    if (!draftContent.trim()) return;
    
    setIsSaving(true);
    try {
      const savedDraft = await apiService.saveChannelDraft(channelId, draftContent, replyToId);
      setDraft(savedDraft);
      lastSavedContentRef.current = draftContent;
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [channelId]);

  const deleteDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      await apiService.deleteChannelDraft(channelId);
      setDraft(null);
      setContent('');
      setQuotedMessage(null);
      lastSavedContentRef.current = '';
      setLastSaved(null);
    } catch (error) {
      console.error('Failed to delete draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [channelId]);

  const clearDraft = useCallback(() => {
    setContent('');
    setQuotedMessage(null);
    deleteDraft();
  }, [deleteDraft]);

  const setQuotedMessageForDraft = useCallback((message: any) => {
    setQuotedMessage({
      id: message.id,
      content: message.content,
      user_id: message.user_id,
      created_at: message.created_at,
      sender: message.sender
    });
  }, []);

  const clearQuotedMessage = useCallback(() => {
    setQuotedMessage(null);
    // Auto-save without quoted message
    if (content.trim()) {
      saveDraft(content, undefined);
    }
  }, [content, saveDraft]);

  return {
    content,
    setContent,
    quotedMessage,
    setQuotedMessage: setQuotedMessageForDraft,
    clearQuotedMessage,
    draft,
    isSaving,
    lastSaved,
    saveDraft,
    deleteDraft,
    clearDraft,
    loadDraft
  };
}