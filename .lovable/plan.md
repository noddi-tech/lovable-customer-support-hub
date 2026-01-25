

## Fix: Use Same Noddi Lookup Component in Chat as Email View

### Problem Identified

The Chat sidebar uses `NoddihKundeData` (simple component), while the Email view uses `NoddiCustomerDetails` + `CustomerSidePanel` with the full "Search by Email / Search by Name" alternative lookup.

| Feature | Email View | Chat View (Current) |
|---------|-----------|---------------------|
| Component | `NoddiCustomerDetails` | `NoddihKundeData` |
| Customer Info | Full (email, source badge) | Basic |
| Alternative Search | ✅ Email + Name tabs | ❌ None |
| User Group selector | ✅ Yes | ❌ No |

### Solution: Replace the Chat Panel Content

Instead of `NoddihKundeData`, the chat sidebar should use the same pattern as the email view:

1. **Use `NoddiCustomerDetails`** for the main customer info card
2. **Add the alternative lookup section** (Search by Email / Search by Name tabs) from `CustomerSidePanel`

---

## Implementation Plan

### File: `src/components/dashboard/conversation-view/ConversationViewContent.tsx`

**Replace the chat panel content (lines 243-257):**

```typescript
// Before
{showNoddiPanel && (
  <div className="w-80 border-l flex-shrink-0 overflow-auto bg-background">
    <div className="flex items-center justify-between p-3 border-b">
      <span className="font-medium text-sm">Customer Details</span>
      <Button ...onClick={() => setShowNoddiPanel(false)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
    <NoddihKundeData customer={conversation.customer} />
  </div>
)}

// After
{showNoddiPanel && (
  <ChatCustomerPanel
    customer={conversation.customer}
    onClose={() => setShowNoddiPanel(false)}
  />
)}
```

---

### Create New Component: `src/components/dashboard/chat/ChatCustomerPanel.tsx`

This component will extract and reuse the same logic from `CustomerSidePanel.tsx`:

```typescript
import { NoddiCustomerDetails } from '@/components/dashboard/voice/NoddiCustomerDetails';
// ... other imports

interface ChatCustomerPanelProps {
  customer: Customer | null;
  onClose: () => void;
}

export const ChatCustomerPanel: React.FC<ChatCustomerPanelProps> = ({
  customer,
  onClose
}) => {
  const [noddiData, setNoddiData] = useState<any>(null);
  const [searchMode, setSearchMode] = useState<'email' | 'name'>('email');
  const [alternativeEmail, setAlternativeEmail] = useState('');
  const [searchFirstName, setSearchFirstName] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Copy alternative search handlers from CustomerSidePanel
  const handleAlternativeEmailSearch = async () => { ... };
  const handleNameSearch = async () => { ... };

  return (
    <div className="w-80 border-l flex-shrink-0 overflow-auto bg-background">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-3 border-b">
        <span className="font-medium text-sm">Customer Details</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-3 space-y-4">
        {/* Same component as email view */}
        <NoddiCustomerDetails
          customerId={customer?.id}
          customerEmail={customer?.email}
          customerPhone={customer?.phone}
          customerName={customer?.full_name}
          noddiEmail={(customer?.metadata as any)?.primary_noddi_email}
          onDataLoaded={setNoddiData}
          noddiData={noddiData}
        />

        {/* Alternative Lookup - same as CustomerSidePanel */}
        {customer?.id && noddiData && !noddiData?.data?.found && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 mb-1">
                    No booking data found
                  </p>
                  <p className="text-xs text-amber-700">
                    Search by alternative email or customer name
                  </p>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-2 mb-3 border-b border-amber-200">
                <button onClick={() => setSearchMode('email')} className={...}>
                  Search by Email
                </button>
                <button onClick={() => setSearchMode('name')} className={...}>
                  Search by Name
                </button>
              </div>

              {/* Email/Name Search Forms */}
              {searchMode === 'email' && (
                <div className="space-y-2">
                  <Input placeholder="alternative@email.com" ... />
                  <Button onClick={handleAlternativeEmailSearch}>Search</Button>
                </div>
              )}
              
              {searchMode === 'name' && (
                <div className="space-y-3">
                  <Input placeholder="First name" ... />
                  <Input placeholder="Last name" ... />
                  <Button onClick={handleNameSearch}>Search</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
```

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/dashboard/chat/ChatCustomerPanel.tsx` | **Create** - New component with `NoddiCustomerDetails` + alternative search |
| `src/components/dashboard/conversation-view/ConversationViewContent.tsx` | **Update** - Replace `NoddihKundeData` with `ChatCustomerPanel` |
| `src/components/dashboard/chat/index.ts` | **Update** - Export new component |

---

## Expected Result

The Chat sidebar will now show the **exact same** Noddi customer information as the email view:

1. **"Customer Information"** card with:
   - Customer name/email
   - Source badge (if applicable)
   - "No Noddi customer data found" alert when not registered

2. **"No booking data found"** card with:
   - **Search by Email** tab - alternative email input
   - **Search by Name** tab - first name + last name inputs
   - Search button with loading state

3. **When customer IS found** - Full booking/order details, same as email view

