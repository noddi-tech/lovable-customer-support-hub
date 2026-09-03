export type FlagValueType = "boolean" | "string" | "number" | "json"

export interface FeatureFlagRecord {
  id: string
  organization_id: string | null
  key: string
  name: string | null
  description: string | null
  enabled: boolean
  value_type: FlagValueType
  /** Map of variant name -> value, e.g. { on: true, off: false } */
  variants: Record<string, unknown>
  /** Variant served when the flag is disabled (or when no rule matches). */
  default_variant: string
  /**
   * Optional targeting, OpenFeature-context based:
   * { onVariant?: string, rules?: [{ contextKey, op: 'eq'|'in'|'contains', value, variant }] }
   */
  targeting: FlagTargeting
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface FlagTargetingRule {
  contextKey: string
  op: "eq" | "in" | "contains"
  value: unknown
  variant: string
}

export interface FlagTargeting {
  onVariant?: string
  rules?: FlagTargetingRule[]
}

export type EvaluationReason = "STATIC" | "DEFAULT" | "TARGETING_MATCH" | "DISABLED" | "ERROR"

export interface FlagResolution<T> {
  value: T
  variant?: string
  reason: EvaluationReason
  errorCode?: "FLAG_NOT_FOUND" | "TYPE_MISMATCH" | "PARSE_ERROR" | "GENERAL"
  errorMessage?: string
}

export type EvalContext = Record<string, unknown>

const DEFAULT_ON = "on"
const DEFAULT_OFF = "off"

function matches(rule: FlagTargetingRule, context: EvalContext): boolean {
  const actual = context[rule.contextKey]
  switch (rule.op) {
    case "eq":
      return actual === rule.value
    case "in":
      return Array.isArray(rule.value) && rule.value.includes(actual)
    case "contains":
      return typeof actual === "string" && typeof rule.value === "string"
        ? actual.includes(rule.value)
        : false
    default:
      return false
  }
}

/**
 * Pure, shared evaluation logic. Used by the in-app OpenFeature provider and
 * mirrored by the OFREP edge function so remote and local results agree.
 */
export function evaluateFlag<T>(
  flag: FeatureFlagRecord | undefined,
  defaultValue: T,
): FlagResolution<T> {
  return evaluateFlagWithContext(flag, defaultValue, {})
}

export function evaluateFlagWithContext<T>(
  flag: FeatureFlagRecord | undefined,
  defaultValue: T,
  context: EvalContext,
): FlagResolution<T> {
  if (!flag) {
    return { value: defaultValue, reason: "ERROR", errorCode: "FLAG_NOT_FOUND" }
  }

  const variants = flag.variants ?? {}
  const pick = (variant: string, reason: EvaluationReason): FlagResolution<T> => {
    if (!(variant in variants)) {
      return {
        value: defaultValue,
        reason: "ERROR",
        errorCode: "GENERAL",
        errorMessage: `Unknown variant "${variant}"`,
      }
    }
    return { value: variants[variant] as T, variant, reason }
  }

  if (!flag.enabled) {
    const off = flag.default_variant || DEFAULT_OFF
    return off in variants ? pick(off, "DISABLED") : { value: defaultValue, reason: "DISABLED" }
  }

  const rules = flag.targeting?.rules ?? []
  for (const rule of rules) {
    if (matches(rule, context)) return pick(rule.variant, "TARGETING_MATCH")
  }

  const on =
    flag.targeting?.onVariant || (DEFAULT_ON in variants ? DEFAULT_ON : flag.default_variant)
  return pick(on, "STATIC")
}
