import type {
  EvaluationContext,
  JsonValue,
  Provider,
  ResolutionDetails,
} from "@openfeature/web-sdk"
import { evaluateFlagWithContext, type FeatureFlagRecord, type FlagResolution } from "./types"

/**
 * OpenFeature provider backed by the `feature_flags` table.
 *
 * The flag set is loaded once (and refreshed by the React provider) so that
 * evaluations stay synchronous, as required by the OpenFeature web SDK.
 */
export class SupabaseFeatureProvider implements Provider {
  readonly metadata = { name: "supabase-feature-flags" } as const
  readonly runsOn = "client" as const

  private flags = new Map<string, FeatureFlagRecord>()

  setFlags(flags: FeatureFlagRecord[]) {
    this.flags = new Map(flags.map((f) => [f.key, f]))
  }

  getFlag(key: string) {
    return this.flags.get(key)
  }

  private resolve<T>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
  ): ResolutionDetails<T> {
    const result: FlagResolution<T> = evaluateFlagWithContext<T>(
      this.flags.get(flagKey),
      defaultValue,
      context,
    )
    return {
      value: result.value,
      variant: result.variant,
      reason: result.reason,
      errorCode: result.errorCode as ResolutionDetails<T>["errorCode"],
      errorMessage: result.errorMessage,
    }
  }

  resolveBooleanEvaluation(flagKey: string, defaultValue: boolean, context: EvaluationContext) {
    return this.resolve<boolean>(flagKey, defaultValue, context)
  }

  resolveStringEvaluation(flagKey: string, defaultValue: string, context: EvaluationContext) {
    return this.resolve<string>(flagKey, defaultValue, context)
  }

  resolveNumberEvaluation(flagKey: string, defaultValue: number, context: EvaluationContext) {
    return this.resolve<number>(flagKey, defaultValue, context)
  }

  resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
  ) {
    return this.resolve<T>(flagKey, defaultValue, context)
  }
}

export const supabaseFeatureProvider = new SupabaseFeatureProvider()
