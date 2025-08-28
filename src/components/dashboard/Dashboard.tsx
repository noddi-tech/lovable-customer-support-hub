import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { InboxSidebar } from './InboxSidebar';
import { AppSidebar } from './AppSidebar';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { Button } from '@/components/ui/button';
import { ResponsiveLayout } from '@/components/ui/responsive-layout';
import { MobileDrawer } from '@/components/ui/mobile-drawer';
import { BottomTabs, type BottomTabItem } from '@/components/ui/bottom-tabs';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useFocusManagement, useAriaLiveRegion } from '@/hooks/use-focus-management';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LayoutDebugger } from '@/components/debug/LayoutDebugger';

import { MessageCircle as MessageCircleIcon, Megaphone, Settings, Wrench } from 'lucide-react';

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