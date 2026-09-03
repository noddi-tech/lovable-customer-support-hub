import { ExternalLink, Mail, Phone, UserRound, X } from "lucide-react"
import { CustomerTimeline } from "@/components/cases/CustomerTimeline"
import { NoddiCustomerDetails } from "@/components/dashboard/voice/NoddiCustomerDetails"
import { EntityTagPicker } from "@/components/tags/TagPicker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useCustomer, useCustomerConversations } from "@/hooks/useCustomerRecord"
import { useDateFormatting } from "@/hooks/useDateFormatting"
import { cn } from "@/lib/utils"
import { useNavigate } from "@/router/compat"

interface CustomerDetailsSidebarProps {
  customerId: string
  onClose: () => void
  className?: string
}

/**
 * Right-hand customer panel used by the customers list — mirrors the customer
 * sidebar shown in the email conversation and live chat views.
 */
export function CustomerDetailsSidebar({
  customerId,
  onClose,
  className,
}: CustomerDetailsSidebarProps) {
  const navigate = useNavigate()
  const { dateTime } = useDateFormatting()
  const { data: customer, isLoading } = useCustomer(customerId)
  const { data: conversations = [] } = useCustomerConversations(customerId)

  return (
    <aside className={cn("flex h-full min-h-0 flex-col bg-background", className)}>
      <div className="flex items-start gap-2 border-b px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserRound className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <h2 className="truncate text-sm font-semibold">
              {customer?.full_name || customer?.email || customer?.phone || "Customer"}
            </h2>
          )}
          <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
            {customer?.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 shrink-0" /> {customer.email}
              </span>
            )}
            {customer?.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3 shrink-0" /> {customer.phone}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{conversations.length} conversations</Badge>
          {customer?.created_at && <span>Since {dateTime(customer.created_at, false)}</span>}
        </div>

        <EntityTagPicker entityType="customer" entityId={customerId} />

        <Separator />

        <NoddiCustomerDetails
          customerId={customerId}
          customerEmail={customer?.email ?? undefined}
          customerPhone={customer?.phone ?? undefined}
          customerName={customer?.full_name ?? undefined}
        />

        <CustomerTimeline customerId={customerId} limit={20} />
      </div>

      <div className="border-t p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate(`/customers/${customerId}`)}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Open full customer record
        </Button>
      </div>
    </aside>
  )
}
