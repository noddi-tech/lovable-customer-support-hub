import React from 'react';
import { useTranslation } from 'react-i18next';

type ConversationStatus = "open" | "pending" | "resolved" | "closed";
type ConversationPriority = "low" | "normal" | "high" | "urgent";
type ConversationChannel = "email" | "chat" | "social";

interface Conversation {
  id: string;
  subject: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  is_read: boolean;
  channel: ConversationChannel;
  updated_at: string;
  customer?: {
    id: string;
    full_name: string;
    email: string;
  };
  assigned_to?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export const Dashboard = () => {
  const { t } = useTranslation();
  
  // Dashboard is now simplified - conversations are handled by InteractionsLayout
  // This component is kept for legacy compatibility but redirects to the new layout

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="max-w-md">
        <h2 className="text-2xl font-semibold mb-4">
          {t('dashboard.legacyRedirect', 'Dashboard component is deprecated')}
        </h2>
        <p className="text-muted-foreground">
          {t('dashboard.useInteractionsLayout', 'Please use the new InteractionsLayout component for conversation management.')}
        </p>
      </div>
    </div>  );
};