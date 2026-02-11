
# AI Chatbot as a Dedicated Admin Section

## Overview

Break the AI Chatbot out of the "Contact Widget" settings into its own dedicated admin section under "AI & Intelligence." This creates a world-class workspace for configuring, testing, and monitoring the chatbot -- separate from widget appearance/embed settings.

## Current Problem

The widget settings page has **9 tabs** crammed together, mixing widget appearance (color, position, embed code) with AI chatbot logic (flow builder, AI analytics, conversation history, knowledge gaps, test mode). This makes it hard to focus on chatbot quality.

## New Structure

The admin sidebar's "AI & Intelligence" group will expand from 2 items to 3:

```text
AI & Intelligence
  - Knowledge Management    (existing, unchanged)
  - AI Chatbot              (NEW dedicated section)
  - Contact Widget          (slimmed down)
```

### AI Chatbot Section (`/admin/ai-chatbot`)

A dedicated page with its own tab layout focused entirely on chatbot excellence:

| Tab | Content | Source |
|-----|---------|--------|
| **Flow** | Visual flow chart builder (existing AiFlowBuilder, enhanced) | Moved from widget |
| **Test** | Live test mode with session logging | Moved from widget |
| **Conversations** | AI conversation history viewer | Moved from widget |
| **Analytics** | AI performance dashboard | Moved from widget |
| **Knowledge Gaps** | Gap detection and auto-learning queue | Moved from widget |

### Slimmed Contact Widget (`/admin/widget`)

Keeps only widget-specific concerns:

| Tab | Content |
|-----|---------|
| **Settings** | Appearance, language, features, messages |
| **Preview** | Widget visual preview |
| **Analytics** | Widget-level analytics (impressions, clicks) |
| **Embed** | Embed code snippet |

## Changes

### 1. New file: `src/components/admin/AiChatbotSettings.tsx`

A new top-level page component for the AI Chatbot section. It:
- Shares the same widget selector sidebar pattern as the current widget settings (since chatbot config is per-widget)
- Has 5 focused tabs: Flow, Test, Conversations, Analytics, Gaps
- Imports existing components: `AiFlowBuilder`, `WidgetTestMode`, `AiConversationHistory`, `AiAnalyticsDashboard`, `KnowledgeGapDetection`
- Fetches widget configs to let the admin select which widget's chatbot to configure

### 2. Update: `src/components/admin/AdminPortalLayout.tsx`

Add "AI Chatbot" to the `intelligenceItems` array:
```
{ title: 'AI Chatbot', url: '/admin/ai-chatbot', icon: Bot }
```

Reorder so it appears between Knowledge Management and Contact Widget.

### 3. Update: `src/App.tsx`

Add route:
```
/admin/ai-chatbot -> AiChatbotSettings (wrapped in ProtectedRoute + AdminRoute)
```

### 4. Update: `src/components/admin/widget/WidgetSettings.tsx`

Remove the AI-related tabs (Flow, Test, Conversations, AI Analytics, Gaps) and their imports. Reduce tab count from 9 to 4: Settings, Preview, Analytics, Embed.

### 5. No database or edge function changes

All existing components and data structures remain unchanged. This is purely a UI reorganization.

## Technical Notes

- The `AiChatbotSettings` page needs access to `widget_configs` to know which chatbot to configure (since chatbot config lives on `widget_configs.ai_flow_config`). It reuses the same widget selector pattern.
- The `WidgetTestMode` component already accepts a `config` prop with the widget config object, so it works identically in the new location.
- All moved components (`AiFlowBuilder`, `AiAnalyticsDashboard`, etc.) remain in `src/components/admin/widget/` -- they're just rendered from a different parent page.
