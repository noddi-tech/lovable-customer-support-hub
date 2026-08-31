import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useBrowserNotifications } from './useBrowserNotifications';

const STORAGE_KEY = 'desktop-email-notifications-enabled';

export function isDesktopEmailNotificationsEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Small store so the settings toggle and the listener stay in sync
 * across components without a full context provider.
 */
const listeners = new Set<(v: boolean) => void>();

export function setDesktopEmailNotificationsEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, String(enabled));
  listeners.forEach((l) => l(enabled));
}

export function useDesktopEmailNotificationsSetting() {
  const [enabled, setEnabled] = useState(isDesktopEmailNotificationsEnabled);

  useEffect(() => {
    const listener = (v: boolean) => setEnabled(v);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const update = useCallback((v: boolean) => {
    setDesktopEmailNotificationsEnabled(v);
  }, []);

  return { enabled, setEnabled: update };
}

/**
 * Global listener: shows a browser (desktop) notification whenever a new
 * inbound customer email arrives in an inbox the current user can access.
 * Mounted once in the app layout.
 */
export function useDesktopEmailNotifications() {
  const { user } = useAuth();
  const { showNotification, permission } = useBrowserNotifications();
  const { enabled } = useDesktopEmailNotificationsSetting();
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !enabled || permission !== 'granted') return;

    const channel = supabase
      .channel('desktop-email-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const message = payload.new as {
            id: string;
            conversation_id: string;
            sender_type: string;
            is_internal: boolean;
            content: string | null;
            email_subject: string | null;
          };

          // Only inbound customer emails, never our own replies or internal notes
          if (message.sender_type !== 'customer' || message.is_internal) return;
          if (seenRef.current.has(message.id)) return;
          seenRef.current.add(message.id);

          // Don't notify for the conversation the user is actively reading
          const isViewingConversation =
            document.visibilityState === 'visible' &&
            window.location.pathname.includes(message.conversation_id);
          if (isViewingConversation) return;

          // RLS scopes this: no row means the user can't access the inbox
          const { data: conversation } = await supabase
            .from('conversations')
            .select('id, subject, channel, customer:customers(full_name, email)')
            .eq('id', message.conversation_id)
            .maybeSingle();

          if (!conversation) return;
          if (conversation.channel && conversation.channel !== 'email') return;

          const customer = conversation.customer as { full_name?: string | null; email?: string | null } | null;
          const from = customer?.full_name || customer?.email || 'New email';
          const subject = message.email_subject || conversation.subject || '(no subject)';
          const preview = (message.content || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 160);

          const notification = await showNotification({
            title: `${from}: ${subject}`,
            body: preview || 'New email received',
            tag: `conversation-${message.conversation_id}`,
            data: { conversationId: message.conversation_id },
          });

          if (notification) {
            notification.onclick = () => {
              window.focus();
              window.location.href = `/c/${message.conversation_id}`;
              notification.close();
            };
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, enabled, permission, showNotification]);
}
