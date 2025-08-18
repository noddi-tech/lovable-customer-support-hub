import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Phone } from 'lucide-react';
import { NewDashboard } from '@/components/dashboard/NewDashboard';
import { VoiceInterface } from '@/components/dashboard/VoiceInterface';
import { useTranslation } from 'react-i18next';

const InteractionsWrapper = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('text');

  return (
    <div className="h-full flex">
      {/* Always visible inbox sidebar */}
      <div className="flex-shrink-0">
        <NewDashboard />
      </div>
    </div>
  );
};

export default InteractionsWrapper;