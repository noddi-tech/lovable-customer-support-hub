/**
 * Optional context fields the embedding site can pass to the widget at init.
 * These are stored on conversation metadata so agents get richer context
 * (which app, which locale, which booking, test vs. production traffic...).
 *
 * Everything here is attacker-controllable, so values are strictly sanitized:
 * only known keys, string coercion, markup/control chars stripped, length caps.
 */

export interface WidgetContext {
  locale?: string;
  environment?: string;
  source_app?: string;
  user_id?: string;
  service_department_id?: string;
  booking_id?: string;
  order_id?: string;
  pathname?: string;
  app_version?: string;
}

const FIELD_LIMITS: Record<keyof WidgetContext, number> = {
  locale: 20,
  environment: 20,
  source_app: 40,
  user_id: 64,
  service_department_id: 64,
  booking_id: 64,
  order_id: 64,
  pathname: 300,
  app_version: 40,
};

function clean(value: unknown, max: number): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).slice(0, max);
  }
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, max);
}

/** Returns a sanitized context object, or undefined when nothing usable was sent. */
export function sanitizeWidgetContext(input: unknown): WidgetContext | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;

  const source = input as Record<string, unknown>;
  const out: Record<string, string> = {};

  for (const [key, max] of Object.entries(FIELD_LIMITS)) {
    const value = clean(source[key], max);
    if (value) out[key] = value;
  }

  return Object.keys(out).length > 0 ? (out as WidgetContext) : undefined;
}
