import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useCallBrandActions } from '@/hooks/useCallBrandActions';
import { getConversationBrand } from '@/lib/conversationBrand';
import { BrandMenuOptions } from '@/components/brands/BrandMenuOptions';
import { TagContextMenuItems } from '@/components/tags/TagContextMenuItems';

interface CallBrandContextMenuProps {
  callId: string;
  metadata: unknown;
  children: React.ReactNode;
  asChild?: boolean;
}

/** Right-click a call row to assign the brand the call belonged to. */
export const CallBrandContextMenu: React.FC<CallBrandContextMenuProps> = ({
  callId,
  metadata,
  children,
  asChild = true,
}) => {
  const { setBrand } = useCallBrandActions();
  const brand = getConversationBrand(metadata, 'voice');

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild={asChild}>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-60 max-h-80 overflow-y-auto p-1">
        <ContextMenuLabel className="text-xs text-muted-foreground">Assign brand</ContextMenuLabel>
        <BrandMenuOptions
          currentLabel={brand?.label}
          onSelect={(brandName) => setBrand(callId, brandName)}
          Item={ContextMenuItem}
          Separator={ContextMenuSeparator}
        />
        <ContextMenuSeparator />
        <ContextMenuLabel className="text-xs text-muted-foreground">Tags</ContextMenuLabel>
        <TagContextMenuItems entityType="call" entityId={callId} />
      </ContextMenuContent>
    </ContextMenu>
  );
};
