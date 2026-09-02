// Layout Components Library
// Flexible, responsive layout components for admin interface

export { AdaptiveSection } from "./AdaptiveSection"
export { InboxList } from "./InboxList"
export { LayoutItem } from "./LayoutItem"
export { MasterDetailShell } from "./MasterDetailShell"
export { PaneTabs, SafeTabsList } from "./PaneTabs"
export { ResponsiveContainer } from "./ResponsiveContainer"
export { ResponsiveFlex } from "./ResponsiveFlex"
export { ResponsiveGrid } from "./ResponsiveGrid"
export {
  ResponsiveTabs,
  ResponsiveTabsContent,
  ResponsiveTabsList,
  ResponsiveTabsTrigger,
} from "./ResponsiveTabs"

// TypeScript utility types
export type ResponsiveValue<T> =
  | T
  | {
      sm?: T
      md?: T
      lg?: T
      xl?: T
    }
