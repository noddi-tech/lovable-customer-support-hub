import { OpenFeature } from "@openfeature/web-sdk"
import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useFeatureFlagList } from "@/hooks/useFeatureFlags"
import { supabaseFeatureProvider } from "@/lib/feature-flags/provider"
import type { FeatureFlagRecord } from "@/lib/feature-flags/types"

interface FeatureFlagsContextValue {
  flags: FeatureFlagRecord[]
  isLoading: boolean
  /** OpenFeature-style evaluation helpers (client-side, static context). */
  getBooleanValue: (key: string, defaultValue?: boolean) => boolean
  getStringValue: (key: string, defaultValue?: string) => string
  getNumberValue: (key: string, defaultValue?: number) => number
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: [],
  isLoading: false,
  getBooleanValue: (_k, d = false) => d,
  getStringValue: (_k, d = "") => d,
  getNumberValue: (_k, d = 0) => d,
})

export const FeatureFlagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, organizationId } = useAuth()
  const { data: flags, isLoading } = useFeatureFlagList()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    OpenFeature.setProvider(supabaseFeatureProvider)
  }, [])

  useEffect(() => {
    void OpenFeature.setContext({
      targetingKey: user?.id ?? "anonymous",
      organizationId: organizationId ?? undefined,
      email: user?.email ?? undefined,
    })
  }, [user?.id, user?.email, organizationId])

  useEffect(() => {
    supabaseFeatureProvider.setFlags(flags ?? [])
    setVersion((v) => v + 1)
  }, [flags])

  const value = useMemo<FeatureFlagsContextValue>(() => {
    const client = OpenFeature.getClient()
    return {
      flags: flags ?? [],
      isLoading,
      getBooleanValue: (key, defaultValue = false) => client.getBooleanValue(key, defaultValue),
      getStringValue: (key, defaultValue = "") => client.getStringValue(key, defaultValue),
      getNumberValue: (key, defaultValue = 0) => client.getNumberValue(key, defaultValue),
    }
  }, [flags, isLoading])

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>
}

export const useFeatureFlags = () => useContext(FeatureFlagsContext)

/** Convenience hook: `const showBeta = useFlag('beta_ui');` */
export const useFlag = (key: string, defaultValue = false) =>
  useFeatureFlags().getBooleanValue(key, defaultValue)
