# Layout Components Library

A comprehensive collection of responsive layout components built on top of shadcn/ui and Tailwind CSS, designed for modern admin interfaces with mobile-first design principles.

## Components

### ResponsiveContainer
A flexible container component that provides consistent padding and width constraints.

```tsx
<ResponsiveContainer 
  className="overflow-y-auto" 
  padding={{ sm: '4', md: '6' }}
  maxWidth="7xl"
>
  Content here
</ResponsiveContainer>
```

### ResponsiveGrid
Auto-responsive grid layout with configurable columns and gaps.

```tsx
<ResponsiveGrid 
  cols={{ sm: '1', md: '2', lg: '3' }} 
  gap="6"
  autoFit={false}
>
  <LayoutItem>Item 1</LayoutItem>
  <LayoutItem>Item 2</LayoutItem>
</ResponsiveGrid>
```

### ResponsiveTabs ⭐
Enhanced tabs component with sidebar navigation support, mobile optimization, and multiple variants.

#### Key Features
- **equalWidth={true}** by default - fixes uneven tab widths shown in photo issues
- **flex-wrap** support - prevents overflow on mobile devices (<640px)
- **scrollable** prop - handles 8+ tabs with horizontal scrolling
- **Mobile-first responsive** - `flex-col` on <640px, `flex-row` on md+ (768px+)
- **Sidebar orientation** - vertical layout for sidebar navigation

#### Variants
- `default` - Standard tabs with background
- `pills` - Rounded pill-style tabs
- `underline` - Bottom border active state
- `borderless` - Clean tabs without borders
- `compact` - Small size for tight spaces

#### Usage Examples

**Basic Tabs:**
```tsx
<ResponsiveTabs defaultValue="tab1" variant="default" equalWidth>
  <ResponsiveTabsList>
    <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
    <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
  </ResponsiveTabsList>
  <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
  <ResponsiveTabsContent value="tab2">Content 2</ResponsiveTabsContent>
</ResponsiveTabs>
```

**Sidebar Navigation:**
```tsx
<ResponsiveTabs 
  variant="pills" 
  size="sm" 
  orientation="vertical"
>
  <ResponsiveTabsList className="flex-col bg-transparent gap-1 w-full">
    <ResponsiveTabsTrigger value="settings" className="w-full justify-start">
      <SettingsIcon className="w-4 h-4 mr-2" />
      Settings
    </ResponsiveTabsTrigger>
  </ResponsiveTabsList>
</ResponsiveTabs>
```

**Mobile with Scrolling:**
```tsx
<ResponsiveTabs 
  variant="underline" 
  size="sm" 
  equalWidth 
  scrollable
>
  <ResponsiveTabsList className="bg-transparent">
    {/* 8+ tabs that scroll horizontally on mobile */}
  </ResponsiveTabsList>
</ResponsiveTabs>
```

### LayoutItem
Flexible layout item with responsive width and alignment controls.

```tsx
<LayoutItem 
  className="lg:col-span-2"
  minWidth={{ sm: '250px', md: '300px' }}
>
  Content here
</LayoutItem>
```

### AdaptiveSection
Spacing and layout section with responsive gap control.

```tsx
<AdaptiveSection 
  spacing="6" 
  className="max-h-[calc(100vh-200px)] overflow-y-auto"
>
  Content with consistent spacing
</AdaptiveSection>
```

## Design Tokens

| Token | CSS Variable | Usage |
|-------|-------------|-------|
| `bg-card` | `--card` | Container backgrounds |
| `border-border` | `--border` | Consistent borders |
| `text-muted-foreground` | `--muted-foreground` | Secondary text |
| `bg-muted` | `--muted` | Tab backgrounds |
| `text-primary` | `--primary` | Accent text |
| `shadow-surface` | Custom shadow | Elevated surfaces |
| `bg-gradient-surface` | Custom gradient | Hero backgrounds |

## Migration Guide

### From Direct shadcn Tabs
```diff
- <TabsList className="grid w-full grid-cols-3 gap-1">
+ <ResponsiveTabs variant="default" equalWidth>
+   <ResponsiveTabsList>
      <TabsTrigger value="tab1">Tab 1</TabsTrigger>
+   </ResponsiveTabsList>
+ </ResponsiveTabs>
```

### From Legacy Grid Classes
```diff
- <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
+ <ResponsiveGrid cols={{ sm: '1', md: '2', lg: '3' }} gap="6">
    <div>Item 1</div>
+ </ResponsiveGrid>
```

### Sidebar Layout Pattern
```tsx
// New comprehensive pattern for Settings/Admin
<ResponsiveContainer className="min-h-screen flex" maxWidth="full">
  <aside className="w-64 bg-card border-r hidden md:flex flex-col">
    {/* Sidebar navigation with ResponsiveTabs vertical */}
  </aside>
  <main className="flex-1 flex flex-col">
    {/* Mobile tabs with scrollable */}
    <ResponsiveContainer className="flex-1 overflow-y-auto">
      {/* Content with ResponsiveGrid and LayoutItem */}
    </ResponsiveContainer>
  </main>
</ResponsiveContainer>
```

## Performance Optimizations

- All components are memoized with `React.memo`
- Computed classes cached with `useMemo`
- Event handlers optimized with `useCallback`
- Minimal re-renders on prop changes

## Accessibility

- Full ARIA support for tabs (`aria-selected`, `aria-controls`)
- Keyboard navigation (Tab, Arrow keys)
- Focus management and screen reader support
- Proper heading hierarchy in sidebar navigation

## Responsive Breakpoints

- `sm`: 640px+ (Mobile landscape)
- `md`: 768px+ (Tablet)
- `lg`: 1024px+ (Desktop)
- `xl`: 1280px+ (Wide desktop)

All components use mobile-first responsive design principles.