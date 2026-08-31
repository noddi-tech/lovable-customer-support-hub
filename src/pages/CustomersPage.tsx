import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomersList } from '@/hooks/useCustomersList';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { Mail, Phone, Search, UserRound, MessageSquare } from 'lucide-react';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { dateTime } = useDateFormatting();
  const { data: customers = [], isLoading } = useCustomersList(search);

  return (
    <UnifiedAppLayout>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-lg font-semibold">
                <UserRound className="h-5 w-5 text-muted-foreground" />
                Customers
              </h1>
              <p className="text-xs text-muted-foreground">
                Every person who has contacted support — open one to see their full interaction history.
              </p>
            </div>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or phone"
              className="pl-9"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No customers found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {c.full_name || c.email || c.phone || 'Unknown customer'}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {c.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" /> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant="secondary" className="gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {c.conversation_count}
                    </Badge>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {c.last_activity_at ? dateTime(c.last_activity_at) : '—'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </UnifiedAppLayout>
  );
}
