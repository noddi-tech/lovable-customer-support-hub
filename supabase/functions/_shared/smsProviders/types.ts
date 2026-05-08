// Provider-agnostic SMS interfaces. Implementations live in sibling files.

export type SmsStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'undelivered';

export interface SmsSendArgs {
  toPhone: string; // E.164
  fromSender: string; // phone number OR alpha sender ID
  body: string;
  dlrUrl?: string;
  externalRef?: string;
}

export interface SmsSendResult {
  ok: boolean;
  providerMessageId?: string;
  segments?: number;
  estimatedPrice?: { amount: number; currency: string };
  errorCode?: string;
  errorMessage?: string;
}

export interface SmsInboundMessage {
  providerMessageId: string;
  fromPhone: string;
  toPhone: string;
  body: string;
  segments: number;
  receivedAt: string; // ISO
}

export interface SmsStatusUpdate {
  providerMessageId: string;
  status: SmsStatus;
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
  segments?: number;
}

export interface SmsProvider {
  name: string;
  send(args: SmsSendArgs): Promise<SmsSendResult>;
  validateInboundSignature(req: Request, body: string): Promise<void>;
  parseInbound(body: unknown): SmsInboundMessage;
  validateStatusSignature(req: Request, body: string): Promise<void>;
  parseStatusUpdate(body: unknown): SmsStatusUpdate;
  buildDlrUrl(baseAppUrl: string): string;
}
