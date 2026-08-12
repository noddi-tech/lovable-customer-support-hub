# Customer Segmentation Logic

## Overview

The customer segmentation system is used to target specific groups of customers for newsletter campaigns. The segmentation criteria are stored in the `newsletter_campaigns` table and used to filter which customers receive a particular newsletter.

## Database Schema

### Newsletter Campaigns Table

The `newsletter_campaigns` table stores segmentation criteria in a JSONB column:

```sql
CREATE TABLE public.newsletter_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  newsletter_id UUID NOT NULL REFERENCES public.newsletters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  segment_criteria JSONB,  -- Stores segmentation rules
  personalization_rules JSONB,
  utm_parameters JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Customers Table

The `customers` table contains the customer data that can be used for segmentation:

```sql
-- Customer fields available for segmentation
{
  id: UUID,
  email: string | null,
  full_name: string | null,
  phone: string | null,
  organization_id: UUID,
  metadata: JSONB | null,  -- Flexible JSON field for custom attributes
  created_at: timestamp,
  updated_at: timestamp
}
```

## Current Segmentation Structure

### Segment Criteria Format

The `segment_criteria` field stores a JSON object with the following structure:

```json
{
  "segment": "segment_id"
}
```

### Available Segments

Currently, the system defines four predefined segments (as defined in `ScheduleDialog.tsx`):

1. **`all`** - All Users
   - Includes all customers in the organization
   - No filtering applied

2. **`customers`** - Customers
   - Customers who have engaged (have conversations)
   - Logic: Customers with at least one conversation

3. **`prospects`** - Prospects
   - Customers who haven't engaged yet
   - Logic: Customers with no conversations

4. **`vip`** - VIP Members
   - High-value or important customers
   - Logic: To be determined (could be based on metadata, conversation count, or custom flags)

## Implementation Logic

### Segment Criteria Storage

When a campaign is scheduled, the segment is stored as:

```typescript
const campaignData = {
  name: campaignName.trim(),
  scheduled_at: scheduledDateTime.toISOString(),
  segment_criteria: { segment: segmentId },  // e.g., { segment: 'customers' }
  target_count: selectedSegment?.count || 0
};
```

### Query Logic for Each Segment

To implement the segmentation in Django, you'll need to query customers based on the segment criteria:

#### 1. All Users (`segment: "all"`)

```python
# Django ORM equivalent
customers = Customer.objects.filter(organization_id=organization_id)
```

#### 2. Customers (`segment: "customers"`)

```python
# Customers who have at least one conversation
customers = Customer.objects.filter(
    organization_id=organization_id
).filter(
    conversations__isnull=False
).distinct()
```

#### 3. Prospects (`segment: "prospects"`)

```python
# Customers with no conversations
customers = Customer.objects.filter(
    organization_id=organization_id
).exclude(
    conversations__isnull=False
).distinct()
```

#### 4. VIP Members (`segment: "vip"`)

```python
# Option 1: Based on metadata field
customers = Customer.objects.filter(
    organization_id=organization_id,
    metadata__is_vip=True  # or metadata__vip_status='active'
)

# Option 2: Based on conversation count (e.g., > 10 conversations)
from django.db.models import Count
customers = Customer.objects.filter(
    organization_id=organization_id
).annotate(
    conversation_count=Count('conversations')
).filter(
    conversation_count__gte=10
)

# Option 3: Based on custom flag in metadata
customers = Customer.objects.filter(
    organization_id=organization_id,
    metadata__contains={'segment': 'vip'}
)
```

## Extended Segmentation Criteria (Future)

The current implementation uses simple segment IDs, but the JSONB structure allows for more complex criteria in the future:

### Example: Complex Criteria Structure

```json
{
  "segment": "custom",
  "filters": [
    {
      "field": "metadata.company",
      "operator": "equals",
      "value": "Acme Corp"
    },
    {
      "field": "conversation_count",
      "operator": "greater_than",
      "value": 5
    }
  ],
  "logic": "AND"  // or "OR"
}
```

### Example: Date-Based Segmentation

```json
{
  "segment": "custom",
  "filters": [
    {
      "field": "created_at",
      "operator": "after",
      "value": "2024-01-01"
    }
  ]
}
```

## Django Implementation Guide

### 1. Model Structure

```python
# models.py
class NewsletterCampaign(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    newsletter = models.ForeignKey(Newsletter, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.TextField()
    segment_criteria = models.JSONField(null=True, blank=True)
    personalization_rules = models.JSONField(null=True, blank=True)
    utm_parameters = models.JSONField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'),
            ('sending', 'Sending'),
            ('sent', 'Sent'),
            ('failed', 'Failed')
        ],
        default='draft'
    )
    sent_count = models.IntegerField(default=0)
    delivered_count = models.IntegerField(default=0)
    opened_count = models.IntegerField(default=0)
    clicked_count = models.IntegerField(default=0)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    email = models.EmailField(null=True, blank=True)
    full_name = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    metadata = models.JSONField(null=True, blank=True, default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### 2. Segmentation Service

```python
# services/segmentation.py
from django.db.models import Count, Q
from typing import List

class SegmentationService:
    SEGMENTS = {
        'all': 'All Users',
        'customers': 'Customers',
        'prospects': 'Prospects',
        'vip': 'VIP Members'
    }
    
    @staticmethod
    def get_customers_for_segment(
        organization_id: str,
        segment_criteria: dict
    ) -> List[Customer]:
        """
        Get customers matching the segment criteria.
        
        Args:
            organization_id: The organization ID to filter by
            segment_criteria: Dictionary with segment criteria
                Example: {"segment": "customers"}
        
        Returns:
            QuerySet of Customer objects
        """
        segment_id = segment_criteria.get('segment', 'all')
        base_query = Customer.objects.filter(organization_id=organization_id)
        
        if segment_id == 'all':
            return base_query
        
        elif segment_id == 'customers':
            # Customers with at least one conversation
            return base_query.filter(
                conversations__isnull=False
            ).distinct()
        
        elif segment_id == 'prospects':
            # Customers with no conversations
            return base_query.exclude(
                conversations__isnull=False
            ).distinct()
        
        elif segment_id == 'vip':
            # VIP customers - check metadata or conversation count
            # Option 1: Check metadata for VIP flag
            vip_query = base_query.filter(
                Q(metadata__is_vip=True) |
                Q(metadata__vip_status='active') |
                Q(metadata__contains={'segment': 'vip'})
            )
            
            # Option 2: High engagement customers (10+ conversations)
            high_engagement = base_query.annotate(
                conversation_count=Count('conversations')
            ).filter(
                conversation_count__gte=10
            )
            
            # Combine both criteria
            return vip_query.union(high_engagement).distinct()
        
        else:
            # Unknown segment, return empty
            return base_query.none()
    
    @staticmethod
    def get_segment_count(
        organization_id: str,
        segment_criteria: dict
    ) -> int:
        """Get the count of customers in a segment."""
        return SegmentationService.get_customers_for_segment(
            organization_id,
            segment_criteria
        ).count()
```

### 3. Campaign Sending Logic

```python
# services/newsletter.py
from .segmentation import SegmentationService

class NewsletterService:
    @staticmethod
    def send_campaign(campaign: NewsletterCampaign):
        """Send newsletter campaign to segmented customers."""
        if not campaign.segment_criteria:
            raise ValueError("Campaign must have segment criteria")
        
        # Get customers for this segment
        customers = SegmentationService.get_customers_for_segment(
            organization_id=campaign.newsletter.organization_id,
            segment_criteria=campaign.segment_criteria
        )
        
        # Update campaign status
        campaign.status = 'sending'
        campaign.save()
        
        # Send to each customer
        sent_count = 0
        for customer in customers:
            try:
                send_newsletter_email(
                    campaign=campaign,
                    customer=customer
                )
                sent_count += 1
            except Exception as e:
                # Log error but continue
                logger.error(f"Failed to send to {customer.email}: {e}")
        
        # Update campaign stats
        campaign.sent_count = sent_count
        campaign.status = 'sent'
        campaign.sent_at = timezone.now()
        campaign.save()
```

## Notes for Django Implementation

1. **Organization Scoping**: All queries must be scoped to the organization to ensure data isolation.

2. **Conversations Relationship**: The segmentation logic assumes a relationship between `Customer` and `Conversation` models. Ensure this relationship exists:
   ```python
   class Conversation(models.Model):
       customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, related_name='conversations')
   ```

3. **Metadata Field**: The `metadata` JSONField allows for flexible custom attributes. VIP status or other segmentation flags can be stored here.

4. **Performance**: For large customer bases, consider:
   - Adding database indexes on `organization_id` and `customer_id` (in conversations)
   - Caching segment counts
   - Using select_related/prefetch_related for related data

5. **Future Extensibility**: The JSONB structure allows for complex filtering rules without schema changes. Consider implementing a query builder that can parse complex criteria.

## Testing

Example test cases:

```python
def test_all_segment_includes_all_customers():
    org = create_organization()
    customer1 = create_customer(organization=org)
    customer2 = create_customer(organization=org)
    
    criteria = {"segment": "all"}
    customers = SegmentationService.get_customers_for_segment(
        org.id, criteria
    )
    
    assert customer1 in customers
    assert customer2 in customers

def test_customers_segment_excludes_prospects():
    org = create_organization()
    customer = create_customer(organization=org)
    prospect = create_customer(organization=org)
    create_conversation(customer=customer)
    
    criteria = {"segment": "customers"}
    customers = SegmentationService.get_customers_for_segment(
        org.id, criteria
    )
    
    assert customer in customers
    assert prospect not in customers
```
