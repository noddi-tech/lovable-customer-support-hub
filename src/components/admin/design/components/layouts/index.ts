// Layout Components Library
// Flexible, responsive layout components for admin interface

export { ResponsiveContainer } from './ResponsiveContainer';
export { ResponsiveFlex } from './ResponsiveFlex';
export { ResponsiveGrid } from './ResponsiveGrid';
export { LayoutItem } from './LayoutItem';
export { 
  ResponsiveTabs, 
  ResponsiveTabsList, 
  ResponsiveTabsTrigger, 
  ResponsiveTabsContent 
} from './ResponsiveTabs';
export { AdaptiveSection } from './AdaptiveSection';
export { MasterDetailShell } from './MasterDetailShell';

// TypeScript utility types
export type ResponsiveValue<T> = T | { 
  sm?: T; 
  md?: T; 
  lg?: T; 
  xl?: T; 
};