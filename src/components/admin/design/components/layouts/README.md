# Layout Components Library

A collection of flexible, responsive layout components built on top of Radix UI and shadcn/ui, designed for consistent admin interface layouts.

## Components

### ResponsiveTabs

A responsive tab component that adapts to different screen sizes and provides multiple styling variants.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'pills' \| 'underline' \| 'borderless' \| 'compact'` | `'default'` | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of tabs (affects font-size, padding, height) |
| `equalWidth` | `boolean` | `false` | Whether tabs should have equal width |
| `justifyContent` | `'start' \| 'center' \| 'end' \| 'between'` | `'start'` | Alignment of tabs |
| `orientation` | `'horizontal' \| 'vertical' \| 'responsive'` | `'responsive'` | Tab orientation |
| `breakpoint` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Breakpoint for responsive orientation |

#### Variants

- **default**: Standard border-bottom style
- **pills**: Rounded background style with muted background
- **underline**: Clean underline style for active tabs
- **borderless**: Minimal style with accent background on hover
- **compact**: Smaller size for tight spaces

#### Sizes

- **sm**: Small (text-xs, h-8, px-2)
- **md**: Medium (text-sm, h-9, px-3)
- **lg**: Large (text-base, h-10, px-4)

#### Usage Examples

##### New API (Recommended)

```tsx
import { ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent } from '@/components/admin/design/components/layouts';

// Basic usage
<ResponsiveTabs defaultValue="tab1" variant="pills" size="md" equalWidth>
  <ResponsiveTabsList>
    <ResponsiveTabsTrigger value="tab1">General</ResponsiveTabsTrigger>
    <ResponsiveTabsTrigger value="tab2">Security</ResponsiveTabsTrigger>
    <ResponsiveTabsTrigger value="tab3">Integrations</ResponsiveTabsTrigger>
  </ResponsiveTabsList>
  <ResponsiveTabsContent value="tab1">
    General settings content
  </ResponsiveTabsContent>
  <ResponsiveTabsContent value="tab2">
    Security settings content
  </ResponsiveTabsContent>
  <ResponsiveTabsContent value="tab3">
    Integrations settings content
  </ResponsiveTabsContent>
</ResponsiveTabs>

// Responsive with equal width
<ResponsiveTabs 
  defaultValue="email" 
  variant="underline" 
  equalWidth 
  justifyContent="center"
  orientation="responsive"
  breakpoint="md"
>
  <ResponsiveTabsList>
    <ResponsiveTabsTrigger value="email">Email</ResponsiveTabsTrigger>
    <ResponsiveTabsTrigger value="sms">SMS</ResponsiveTabsTrigger>
    <ResponsiveTabsTrigger value="voice">Voice</ResponsiveTabsTrigger>
  </ResponsiveTabsList>
  <ResponsiveTabsContent value="email">Email content</ResponsiveTabsContent>
  <ResponsiveTabsContent value="sms">SMS content</ResponsiveTabsContent>
  <ResponsiveTabsContent value="voice">Voice content</ResponsiveTabsContent>
</ResponsiveTabs>

// Compact variant for limited space
<ResponsiveTabs defaultValue="overview" variant="compact" size="sm">
  <ResponsiveTabsList>
    <ResponsiveTabsTrigger value="overview">Overview</ResponsiveTabsTrigger>
    <ResponsiveTabsTrigger value="details">Details</ResponsiveTabsTrigger>
  </ResponsiveTabsList>
  <ResponsiveTabsContent value="overview">Overview content</ResponsiveTabsContent>
  <ResponsiveTabsContent value="details">Details content</ResponsiveTabsContent>
</ResponsiveTabs>
```

##### Legacy API (Backward Compatible)

```tsx
const tabItems = [
  { value: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
  { value: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
];

<ResponsiveTabs 
  items={tabItems} 
  defaultValue="tab1" 
  variant="pills"
  fullWidth
/>
```

### Design Tokens Used

| Token | Value | Usage |
|-------|-------|-------|
| `bg-muted` | `hsl(var(--muted))` | Background for pills variant |
| `bg-muted/50` | `hsl(var(--muted) / 0.5)` | Background for compact variant |
| `bg-card` | `hsl(var(--card))` | Tab list background |
| `bg-background` | `hsl(var(--background))` | Active tab background |
| `text-foreground` | `hsl(var(--foreground))` | Active tab text |
| `text-muted-foreground` | `hsl(var(--muted-foreground))` | Inactive tab text |
| `border-primary` | `hsl(var(--primary))` | Active underline border |
| `border-muted` | `hsl(var(--muted))` | Default borders |
| `hover:bg-accent` | `hsl(var(--accent))` | Hover background |
| `hover:text-accent-foreground` | `hsl(var(--accent-foreground))` | Hover text |

### Migration Guide

Replace existing shadcn tab implementations with ResponsiveTabs:

#### Before
```tsx
<Tabs defaultValue="general" className="w-full">
  <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-1 bg-card/50">
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="security">Security</TabsTrigger>
    <TabsTrigger value="integrations">Integrations</TabsTrigger>
  </TabsList>
  <TabsContent value="general">General content</TabsContent>
  <TabsContent value="security">Security content</TabsContent>
  <TabsContent value="integrations">Integrations content</TabsContent>
</Tabs>
```

#### After
```tsx
<ResponsiveTabs defaultValue="general" variant="default" equalWidth>
  <ResponsiveTabsList>
    <ResponsiveTabsTrigger value="general">General</ResponsiveTabsTrigger>
    <ResponsiveTabsTrigger value="security">Security</ResponsiveTabsTrigger>
    <ResponsiveTabsTrigger value="integrations">Integrations</ResponsiveTabsTrigger>
  </ResponsiveTabsList>
  <ResponsiveTabsContent value="general">General content</ResponsiveTabsContent>
  <ResponsiveTabsContent value="security">Security content</ResponsiveTabsContent>
  <ResponsiveTabsContent value="integrations">Integrations content</ResponsiveTabsContent>
</ResponsiveTabs>
```

### Responsive Behavior

- **Mobile (<640px)**: Tabs stack vertically (`flex-col`) with full width
- **Tablet (768px+)**: Tabs switch to horizontal layout (`flex-row`) 
- **Desktop (1024px+)**: Maintains horizontal layout with flex-wrap for overflow
- **EqualWidth**: When enabled, tabs take equal space using `flex-1`
- **Overflow**: Uses `flex-wrap` to prevent horizontal overflow on smaller screens

### Accessibility

- Full keyboard navigation support (Tab, Arrow keys)
- Proper ARIA attributes (`aria-selected`, `aria-controls`, `role="tabpanel"`)
- Focus management and visual focus indicators
- Screen reader support with proper labeling

### Performance

- Components are memoized to prevent unnecessary re-renders
- Lazy loading support for tab content when needed
- Optimized for large numbers of tabs (10+ tabs tested)

## Other Components

### ResponsiveContainer
Flexible container with responsive padding and max-width constraints.

### ResponsiveFlex  
Flexbox container with responsive direction, alignment, and spacing.

### ResponsiveGrid
Grid container with responsive column counts and gap spacing.

### LayoutItem
Individual layout item with responsive sizing and positioning.

### AdaptiveSection
Section component that adapts content layout based on screen size.

## Storybook

View component examples and documentation:
```bash
npm run storybook
```

Stories are located in `src/components/admin/design/stories/`

## Testing

Run tests with coverage:
```bash
npm run test -- --coverage
```

Test files are located in `src/components/admin/design/components/layouts/__tests__/`