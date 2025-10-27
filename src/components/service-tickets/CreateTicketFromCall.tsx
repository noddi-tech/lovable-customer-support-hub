import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Ticket } from 'lucide-react';
import { CreateTicketDialog } from './CreateTicketDialog';
import type { ServiceTicketPriority, ServiceTicketCategory } from '@/types/service-tickets';

interface CreateTicketFromCallProps {
  callId: string;
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultPriority?: ServiceTicketPriority;
  defaultCategory?: ServiceTicketCategory;
}

export function CreateTicketFromCall({
  callId,
  customerId,
  customerEmail,
  customerPhone,
  defaultTitle,
  defaultDescription,
  defaultPriority = 'normal',
  defaultCategory,
}: CreateTicketFromCallProps) {
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
        callId={callId}
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
