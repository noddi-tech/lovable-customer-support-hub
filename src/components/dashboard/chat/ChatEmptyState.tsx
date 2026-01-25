import React from 'react';
import { MessageCircle, Users } from 'lucide-react';

export const ChatEmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/10 p-8">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <MessageCircle className="h-10 w-10 text-primary" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <Users className="h-4 w-4 text-green-600" />
        </div>
      </div>
      
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Select a chat to start
      </h2>
      
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Choose a conversation from the list on the left, or claim a waiting visitor from the queue above.
      </p>

      <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-dashed max-w-xs">
        <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Tips for great chat support
        </h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Respond quickly to waiting visitors</li>
          <li>• Keep messages short and helpful</li>
          <li>• Use the Noddi panel to identify customers</li>
          <li>• Transfer complex issues to specialists</li>
        </ul>
      </div>
    </div>
  );
};
