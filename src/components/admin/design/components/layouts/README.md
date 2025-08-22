# Layout Components Library

A comprehensive, responsive layout component library built for React applications using Tailwind CSS, Radix UI, and shadcn/ui.

## Overview

This library provides 6 flexible, mobile-first layout components designed to eliminate repetitive CSS patterns and create consistent, responsive layouts across your application.

## Components

### ResponsiveContainer

A flexible container component with responsive padding and max-width controls.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `padding` | `ResponsiveValue<string>` | `'4'` | Responsive padding values |
| `maxWidth` | `'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '4xl' \| '7xl' \| 'full'` | `'7xl'` | Maximum width constraint |
| `center` | `boolean` | `true` | Center the container horizontally |
| `as` | `'div' \| 'section' \| 'main' \| 'article'` | `'div'` | HTML element to render |

**Usage:**
```tsx
<ResponsiveContainer padding={{ sm: '4', md: '6' }} maxWidth="lg">
  <YourContent />
</ResponsiveContainer>
```

### ResponsiveFlex

A flexible flexbox component with responsive direction, gap, and alignment options.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'row' \| 'col' \| 'responsive'` | `'responsive'` | Flex direction behavior |
| `breakpoint` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Breakpoint for responsive direction |
| `gap` | `ResponsiveValue<string>` | `'4'` | Gap between flex items |
| `wrap` | `boolean` | `true` | Allow flex wrapping |
| `alignment` | `'start' \| 'center' \| 'end' \| 'stretch'` | `'start'` | Cross-axis alignment |
| `justify` | `'start' \| 'center' \| 'end' \| 'between' \| 'around' \| 'evenly'` | `'start'` | Main-axis justification |

**Usage:**
```tsx
<ResponsiveFlex gap={{ sm: '2', md: '4' }} justify="between">
  <div>Item 1</div>
  <div>Item 2</div>
</ResponsiveFlex>
```

### ResponsiveGrid

A CSS Grid component with responsive columns and auto-fit capabilities.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cols` | `ResponsiveValue<string>` | `{ sm: '1', md: '2', lg: '3' }` | Number of grid columns |
| `gap` | `ResponsiveValue<string>` | `'4'` | Gap between grid items |
| `autoFit` | `boolean` | `false` | Enable auto-fit with minColWidth |
| `minColWidth` | `string` | `'250px'` | Minimum column width for auto-fit |
| `alignment` | `'start' \| 'center' \| 'end' \| 'stretch'` | `'start'` | Grid item alignment |

**Usage:**
```tsx
<ResponsiveGrid cols={{ sm: '1', md: '2', lg: '3' }} gap="6">
  <Card>Card 1</Card>
  <Card>Card 2</Card>
  <Card>Card 3</Card>
</ResponsiveGrid>
```

### LayoutItem

A flex item component with responsive sizing and ordering capabilities.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `flex` | `'none' \| 'auto' \| '1' \| 'initial'` | `'1'` | Flex grow/shrink behavior |
| `minWidth` | `ResponsiveValue<string>` | `undefined` | Minimum width constraints |
| `maxWidth` | `ResponsiveValue<string>` | `undefined` | Maximum width constraints |
| `order` | `ResponsiveValue<string>` | `undefined` | Flex order property |
| `align` | `'auto' \| 'start' \| 'center' \| 'end' \| 'stretch'` | `'auto'` | Self alignment |

**Usage:**
```tsx
<ResponsiveFlex>
  <LayoutItem flex="2" minWidth={{ sm: '200px', md: '300px' }}>
    Main content
  </LayoutItem>
  <LayoutItem flex="1">
    Sidebar
  </LayoutItem>
</ResponsiveFlex>
```

### ResponsiveTabs

A responsive tabs component built on Radix UI Tabs with orientation and variant support.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `TabItem[]` | `required` | Array of tab items with value, label, content |
| `orientation` | `'horizontal' \| 'vertical' \| 'responsive'` | `'responsive'` | Tab orientation |
| `variant` | `'default' \| 'pills' \| 'underline'` | `'default'` | Visual variant |
| `spacing` | `ResponsiveValue<string>` | `'4'` | Gap between tabs |
| `fullWidth` | `boolean` | `false` | Make tabs fill full width |

**Usage:**
```tsx
const tabItems = [
  { value: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
  { value: 'tab2', label: 'Tab 2', content: <div>Content 2</div> }
];

<ResponsiveTabs 
  items={tabItems} 
  variant="pills" 
  orientation="responsive"
  breakpoint="md"
/>
```

### AdaptiveSection

A versatile section component with spacing, visual styling, and responsive properties.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `spacing` | `ResponsiveValue<string>` | `'4'` | Space between child elements |
| `direction` | `'x' \| 'y' \| 'both'` | `'y'` | Spacing direction |
| `padding` | `ResponsiveValue<string>` | `undefined` | Internal padding |
| `margin` | `ResponsiveValue<string>` | `undefined` | External margin |
| `background` | `'none' \| 'muted' \| 'card' \| 'accent'` | `'none'` | Background variant |
| `border` | `boolean` | `false` | Add border |
| `rounded` | `boolean` | `false` | Add rounded corners |
| `shadow` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'none'` | Shadow intensity |

**Usage:**
```tsx
<AdaptiveSection 
  background="card" 
  padding={{ sm: '4', md: '6' }}
  spacing="6"
  rounded={true}
  shadow="md"
>
  <h2>Section Title</h2>
  <p>Section content</p>
</AdaptiveSection>
```

## Mobile-First Best Practices

1. **Start with Mobile**: All components default to mobile-friendly layouts (flex-col, grid-cols-1)
2. **Progressive Enhancement**: Use responsive props to enhance layouts for larger screens
3. **Flexible Wrapping**: Leverage `flex-wrap` and `autoFit` to prevent overflow
4. **Consistent Breakpoints**: Use standard Tailwind breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)

## Radix/shadcn Integration

- **ResponsiveTabs** wraps Radix Tabs primitive, preserving all accessibility features
- Use `cn()` utility for custom styling without losing base functionality  
- All components support `className` prop for additional customization
- Maintain Radix state management (controlled/uncontrolled patterns)

## Performance Features

- **React.memo**: All components are memoized to prevent unnecessary re-renders
- **useMemo**: Class computations are memoized for expensive calculations
- **useCallback**: Event handlers are memoized to maintain referential stability
- **Bundle Optimization**: Consider dynamic imports for heavy components:

```tsx
const ResponsiveTabs = React.lazy(() => import('./ResponsiveTabs'));
```

## TypeScript Support

### ResponsiveValue Type

```tsx
type ResponsiveValue<T> = T | { 
  sm?: T; 
  md?: T; 
  lg?: T; 
  xl?: T; 
};
```

Use this type for any prop that supports responsive behavior:

```tsx
interface MyComponentProps {
  spacing: ResponsiveValue<string>;
  padding: ResponsiveValue<string>;
}
```

## Testing

Comprehensive test suite covers:
- ✅ Responsiveness (breakpoint transitions, viewport simulation)
- ✅ Accessibility (ARIA roles, keyboard navigation)  
- ✅ Edge cases (1-15+ children, long content, nested layouts)
- ✅ Performance (render count optimization)

Run tests: `npm test -- layouts`

## Bundle Impact

- **Base library**: ~8KB gzipped
- **ResponsiveTabs**: Additional ~4KB (Radix UI Tabs)
- **Tree-shakable**: Import only components you use
- **Zero runtime CSS**: All styling via Tailwind utilities

## Migration Guide

Replace repetitive patterns with library components:

```tsx
// Before
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id}>{item}</Card>)}
</div>

// After  
<ResponsiveGrid>
  {items.map(item => <Card key={item.id}>{item}</Card>)}
</ResponsiveGrid>
```

```tsx
// Before
<div className="flex flex-col md:flex-row gap-4 items-start justify-between">
  <div className="flex-1">Main</div>
  <div className="flex-none w-64">Sidebar</div>
</div>

// After
<ResponsiveFlex justify="between">
  <LayoutItem flex="1">Main</LayoutItem>
  <LayoutItem flex="none" minWidth="16rem">Sidebar</LayoutItem>
</ResponsiveFlex>
```