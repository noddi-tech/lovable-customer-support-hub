import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface InspectorProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  isOpen?: boolean;
  onClose?: () => void;
  collapsible?: boolean;
}

const Inspector = ({ 
  children, 
  className, 
  title,
  isOpen = true,
  onClose,
  collapsible = true 
}: InspectorProps) => {
  if (!isOpen) return null;

  return (
    <aside className={cn("inspector border-l bg-background", className)}>
      {(title || collapsible) && (
        <div className="flex items-center justify-between p-4 border-b">
          {title && <h3 className="font-medium">{title}</h3>}
          {collapsible && onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      <div className="p-4 flex-1 overflow-y-auto">
        {children}
      </div>
    </aside>
  );
};

export default Inspector;