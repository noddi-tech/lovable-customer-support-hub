import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomerConversations } from '@/hooks/useCustomerRecord';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { History, Mail, MessageSquare } from 'lucide-react';

interface CustomerHistoryCardProps {
  customerId?: string | null;
  currentConversationId?: string | null;
}

export function CustomerHistoryCard({ customerId, currentConversationId }: CustomerHistoryCardProps) {
  const navigate = useNavigate();
  const { dateTime } = useDateFormatting();
  const { data: conversations = [], isLoading } = useCustomerConversations(
    customerId,
    currentConversationId,
  );

  if (!customerId) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="h-4 w-4" /> Previous contacts
          {conversations.length > 0 && (
            <Badge variant="outline" className="ml-auto text-[10px]">
              {conversations.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading history…</p>
        ) : conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground">First time this customer contacts us.</p>
        ) : (
          <>
            {conversations.slice(0, 5).map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/c/${c.id}`)}
                className="w-full rounded-md border p-2 text-left transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center gap-2">
                  {c.channel === 'email' ? (
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {c.subject || '(no subject)'}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{dateTime(c.updated_at)}</p>
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => navigate(`/customers/${customerId}`)}
            >
              View full customer record
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
