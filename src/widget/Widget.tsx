import type React from "react"
import { useCallback, useEffect, useState } from "react"
import {
  contextFromInitOptions,
  fetchWidgetConfig,
  getIdentity,
  setApiUrl,
  setBrand,
  setIdentity,
  setWidgetContext,
  setWidgetKey,
  storeChatSession,
} from "./api"
import { FloatingButton } from "./components/FloatingButton"
import { WidgetPanel } from "./components/WidgetPanel"
import { useUnreadWatcher } from "./hooks/useUnreadWatcher"
import { resolveTheme, sanitizeTheme, themeCssVars, type WidgetThemeOptions } from "./theme"
import type { WidgetConfig, WidgetInitOptions } from "./types"
import "./styles/widget.css"

// API interface for programmatic control
export interface WidgetAPI {
  setIsOpen: (open: boolean) => void
  toggle: () => void
  /** Re-read identity after a NoddiWidget('identify', ...) call. */
  refreshIdentity: () => void
  /** Forget the visitor and any open chat (NoddiWidget('shutdown')). */
  reset: () => void
  /** Apply host brand colours mid-session (NoddiWidget('update', { theme })). */
  setTheme: (theme: WidgetThemeOptions) => void
}

interface WidgetProps {
  options: WidgetInitOptions
  onMount?: (api: WidgetAPI) => void
}

export const Widget: React.FC<WidgetProps> = ({ options, onMount }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<WidgetConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped whenever identity changes so the panel picks up the new visitor.
  const [identityVersion, setIdentityVersion] = useState(0)
  // Bumped on shutdown to hard-reset panel state.
  const [resetVersion, setResetVersion] = useState(0)
  // Host-supplied brand colours; merged over the admin-configured colour.
  const [hostTheme, setHostTheme] = useState<WidgetThemeOptions>(() => sanitizeTheme(options.theme))

  // Unread agent replies while the panel is closed.
  const { unreadCount, clearUnread } = useUnreadWatcher(!isOpen)

  const openPanel = useCallback(
    (open: boolean) => {
      setIsOpen(open)
      if (open) clearUnread()
    },
    [clearUnread],
  )

  // Expose API for programmatic control
  useEffect(() => {
    if (onMount) {
      onMount({
        setIsOpen: openPanel,
        toggle: () =>
          setIsOpen((prev) => {
            if (!prev) clearUnread()
            return !prev
          }),
        refreshIdentity: () => setIdentityVersion((v) => v + 1),
        reset: () => {
          storeChatSession(null)
          clearUnread()
          setIsOpen(false)
          setResetVersion((v) => v + 1)
        },
        setTheme: (next) => setHostTheme((prev) => ({ ...prev, ...sanitizeTheme(next) })),
      })
    }
  }, [onMount, openPanel, clearUnread])

  useEffect(() => {
    if (options.apiUrl) {
      setApiUrl(options.apiUrl)
    }
    setWidgetKey(options.widgetKey)
    if (options.brand) setBrand(options.brand)
    // Flat init fields first, then the structured `context` bag wins.
    setWidgetContext({ ...contextFromInitOptions(options), ...(options.context || {}) })
    if (options.identity) {
      setIdentity({
        user_id: options.identity.userId,
        email: options.identity.email,
        name: options.identity.name,
        phone: options.identity.phone,
      })
      setIdentityVersion((v) => v + 1)
    }

    const loadConfig = async () => {
      setIsLoading(true)
      const widgetConfig = await fetchWidgetConfig(options.widgetKey)

      if (widgetConfig) {
        setConfig(widgetConfig)
        setError(null)
      } else {
        setError("Failed to load widget configuration")
      }

      setIsLoading(false)
    }

    loadConfig()
  }, [options])

  // Don't render anything while loading or on error
  if (isLoading || error || !config) {
    return null
  }

  const theme = resolveTheme(config.primaryColor, hostTheme)
  const themedConfig: WidgetConfig = {
    ...config,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    accentColor: theme.accentColor,
  }

  // Apply position override from init options, or fall back to config
  const effectivePosition = options.position ?? config.position

  // Determine if button should be shown (default: true)
  const showButton = options.showButton !== false

  return (
    <div className="noddi-widget-container" style={themeCssVars(theme)}>
      {isOpen && (
        <WidgetPanel
          key={`${identityVersion}-${resetVersion}`}
          config={themedConfig}
          onClose={() => setIsOpen(false)}
          positionOverride={effectivePosition}
          identity={getIdentity()}
        />
      )}
      {showButton && (
        <FloatingButton
          isOpen={isOpen}
          onClick={() => openPanel(!isOpen)}
          primaryColor={theme.primaryColor}
          position={effectivePosition}
          unreadCount={unreadCount}
        />
      )}
    </div>
  )
}
