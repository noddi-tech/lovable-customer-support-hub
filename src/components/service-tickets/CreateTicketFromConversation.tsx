import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Ticket } from 'lucide-react';
import { CreateTicketDialog } from './CreateTicketDialog';
import type { ServiceTicketPriority, ServiceTicketCategory } from '@/types/service-tickets';

interface CreateTicketFromConversationProps {
  conversationId: string;
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultPriority?: ServiceTicketPriority;
  defaultCategory?: ServiceTicketCategory;
}

export function CreateTicketFromConversation({
  conversationId,
  customerId,
  customerEmail,
  customerPhone,
  defaultTitle,
  defaultDescription,
  defaultPriority = 'normal',
  defaultCategory,
}: CreateTicketFromConversationProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Ticket className="h-4 w-4" />
        Create Service Ticket
      </Button>

      <CreateTicketDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        conversationId={conversationId}
        customerId={customerId}
        customerEmail={customerEmail}
        customerPhone={customerPhone}
        prefillData={{
          title: defaultTitle,
          description: defaultDescription,
          category: defaultCategory,
        }}
      />
    </>
  );
}
