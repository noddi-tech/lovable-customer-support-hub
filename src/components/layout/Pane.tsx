import React from 'react';
import { cn } from '@/lib/utils';

interface PaneProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

interface PaneToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

interface PaneBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface PaneFooterProps {
  children: React.ReactNode;
  className?: string;
}

const Pane = ({ children, className, id }: PaneProps) => {
  return (
    <div className={cn("pane flex flex-col", className)} id={id}>
      {children}
    </div>
  );
};

const PaneToolbar = ({ children, className, ...props }: PaneToolbarProps) => {
  return (
    <div className={cn("pane-toolbar flex items-center gap-2 p-4", className)} {...props}>
      {children}
    </div>
  );
};

const PaneBody = ({ children, className }: PaneBodyProps) => {
  return (
    <div className={cn("pane-body flex-1", className)}>
      {children}
    </div>
  );
};

const PaneFooter = ({ children, className }: PaneFooterProps) => {
  return (
    <div className={cn("flex items-center justify-between p-4 border-t bg-background", className)}>
      {children}
    </div>
  );
};

export { Pane, PaneToolbar, PaneBody, PaneFooter };