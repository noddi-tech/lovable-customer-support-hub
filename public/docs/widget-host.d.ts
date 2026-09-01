/**
 * Noddi Support Hub — embed contract v1.
 *
 * Copy this file into your host app (or `curl` it from
 * https://support.noddi.co/docs/widget-host.d.ts) and reference it instead of
 * inventing `Record<string, unknown>` payloads.
 *
 * Versioning: additive changes bump the minor contract version and never
 * remove a documented field. Unknown keys are dropped server-side.
 */

export type WidgetEnvironment = 'production' | 'staging' | 'development';

/** Documented allow-list of context fields. Anything else is dropped. */
export interface WidgetHostContext {
  /** BCP-47 locale of the visitor, e.g. 'nb-NO'. Max 20 chars. */
  locale?: string;
  /** Deployment the widget runs in. Non-production is badged for agents. */
  environment?: WidgetEnvironment;
  /** Product surface, e.g. 'customer' | 'partner' | 'marketing'. Max 40. */
  sourceApp?: string;
  /** Logged-in user id in the host system. Max 64. */
  userId?: string | number;
  /** Service department the visitor belongs to. Max 64. */
  serviceDepartmentId?: string | number;
  /** Booking currently open in the host app. Max 64. */
  bookingId?: string | number;
  /** Booking slug, for draft flows that have no numeric id yet. Max 80. */
  bookingSlug?: string;
  /** Order currently open in the host app. Max 64. */
  orderId?: string | number;
  /** Licence plate the visitor is working with. Max 16. */
  licensePlate?: string;
  /** Human-readable car description. Max 80. */
  car?: string;
  /** SPA route; defaults to the live location. Max 300. */
  pathname?: string;
  /** Host app release/version. Max 40. */
  appVersion?: string;
}

/** Unverified visitor hint. Never grants access to customer data. */
export interface WidgetIdentity {
  userId?: string | number;
  email?: string;
  name?: string;
  phone?: string;
}

/**
 * Brand colours from the host app, mirroring the backend Brand model
 * (color_primary / color_secondary / color_accent). Accepts hex, rgb(),
 * hsl() or CSS colour names. Invalid values are ignored.
 */
export interface WidgetTheme {
  /** Header, primary buttons, customer bubbles, launcher. */
  primaryColor?: string;
  /** Secondary buttons, badges, subtle surfaces. Defaults to primary. */
  secondaryColor?: string;
  /** Links, focus rings, selected states. Defaults to secondary. */
  accentColor?: string;
  /** Text/icon colour on top of primary. Auto-derived for contrast when omitted. */
  onPrimaryColor?: string;
}

export interface WidgetInitOptions {
  /** Required. Public widget key from Admin → Widget settings. */
  widgetKey: string;
  /**
   * Languages the host app supports, e.g. ['nb-NO', 'en-US', 'sv-SE'].
   * The picker shows the intersection with the languages the widget ships,
   * in this order. Omit to keep the widget default set. Max 20 entries,
   * 20 chars each; unknown locales are dropped.
   */
  supportedLocales?: string[];
  /**
   * Host gate for the knowledge-base / help-centre home button.
   * `false` always hides it, `true` shows it only when the admin widget
   * config also enables it, omitted keeps the admin config alone.
   */
  enableKnowledgeSearch?: boolean;
  /** Brand name or slug from the Noddi brand catalog. Max 40. */
  brand?: string;
  /** Preferred: one nested context object. */
  context?: WidgetHostContext;
  /** Known visitor at boot; equivalent to calling `identify` after init. */
  identity?: WidgetIdentity;
  /** Brand colours; overrides the colour configured in Admin → Widget. */
  theme?: WidgetTheme;
  /** Override the backend base URL (self-hosting / staging). */
  apiUrl?: string;
  /** Hide the floating launcher and drive the widget yourself. */
  showButton?: boolean;
  position?: 'bottom-right' | 'bottom-left';
  onReady?: () => void;
}

export interface WidgetUpdateOptions extends WidgetHostContext {
  /** Mid-session brand change (multi-brand SPAs). */
  brand?: string;
  /** Narrow (or reset) the language picker mid-session. See init. */
  supportedLocales?: string[];
  /** Show/hide the help-centre home button mid-session. See init. */
  enableKnowledgeSearch?: boolean;
  /** Preferred nested form; merged over any flat fields above. */
  context?: WidgetHostContext;
  /** `null` clears the visitor (same as `clearIdentity`). */
  identity?: WidgetIdentity | null;
  /** Apply new brand colours mid-session (theme switch / multi-brand SPAs). */
  theme?: WidgetTheme;
}

export interface WidgetHostCommands {
  (command: 'init', options: WidgetInitOptions): void;
  (command: 'identify', options: WidgetIdentity | null): void;
  (command: 'clearIdentity'): void;
  (command: 'update', options: WidgetUpdateOptions): void;
  (command: 'open' | 'close' | 'toggle' | 'shutdown'): void;
  (command: 'isReady'): boolean;
  (command: 'onReady', callback: () => void): void;

  init(options: WidgetInitOptions): void;
  identify(options: WidgetIdentity | null): void;
  clearIdentity(): void;
  update(options: WidgetUpdateOptions): void;
  open(): void;
  close(): void;
  toggle(): void;
  shutdown(): void;
  isReady(): boolean;
  onReady(callback: () => void): void;

  /** Pre-boot command queue installed by the embed snippet. */
  q?: unknown[];
}

declare global {
  interface Window {
    NoddiWidget: WidgetHostCommands;
  }
}

export {};
