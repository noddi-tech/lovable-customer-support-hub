import React from 'react';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { SettingsSidebar } from '@/components/layout/SettingsSidebar';
import AdminDesignComponents from './AdminDesignComponents';

export default function AdminDesignComponentsPage() {
  return (
    <UnifiedAppLayout sidebar={<SettingsSidebar />}>
      <AdminDesignComponents />
    </UnifiedAppLayout>
  );
}