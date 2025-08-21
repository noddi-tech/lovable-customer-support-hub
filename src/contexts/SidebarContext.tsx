import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SidebarState {
  selectedTab: string;
  selectedInboxId?: string;
  expandedSections: Record<string, boolean>;
  collapsedMode: boolean;
}

interface SidebarContextType {
  state: SidebarState;
  updateSelectedTab: (tab: string) => void;
  updateSelectedInboxId: (inboxId?: string) => void;
  toggleSectionExpanded: (sectionId: string) => void;
  setSectionExpanded: (sectionId: string, expanded: boolean) => void;
  toggleCollapsedMode: () => void;
  setCollapsedMode: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
  initialTab?: string;
  initialInboxId?: string;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({
  children,
  initialTab = 'all',
  initialInboxId
}) => {
  const [state, setState] = useState<SidebarState>({
    selectedTab: initialTab,
    selectedInboxId: initialInboxId,
    expandedSections: {
      inbox: true,
      notifications: true,
      channels: true,
      inboxes: true
    },
    collapsedMode: false
  });

  const updateSelectedTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, selectedTab: tab }));
  }, []);

  const updateSelectedInboxId = useCallback((inboxId?: string) => {
    setState(prev => ({ ...prev, selectedInboxId: inboxId }));
  }, []);

  const toggleSectionExpanded = useCallback((sectionId: string) => {
    setState(prev => ({
      ...prev,
      expandedSections: {
        ...prev.expandedSections,
        [sectionId]: !prev.expandedSections[sectionId]
      }
    }));
  }, []);

  const setSectionExpanded = useCallback((sectionId: string, expanded: boolean) => {
    setState(prev => ({
      ...prev,
      expandedSections: {
        ...prev.expandedSections,
        [sectionId]: expanded
      }
    }));
  }, []);

  const toggleCollapsedMode = useCallback(() => {
    setState(prev => ({ ...prev, collapsedMode: !prev.collapsedMode }));
  }, []);

  const setCollapsedMode = useCallback((collapsed: boolean) => {
    setState(prev => ({ ...prev, collapsedMode: collapsed }));
  }, []);

  const value: SidebarContextType = {
    state,
    updateSelectedTab,
    updateSelectedInboxId,
    toggleSectionExpanded,
    setSectionExpanded,
    toggleCollapsedMode,
    setCollapsedMode
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};