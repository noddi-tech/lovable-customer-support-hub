import type { SmsProvider } from './types.ts';
import { messenteProvider } from './messente.ts';

export function getSmsProvider(name: string): SmsProvider {
  switch (name) {
    case 'messente':
      return messenteProvider();
    case 'twilio':
      throw new Error('Twilio SMS provider not implemented yet');
    default:
      throw new Error(`Unknown SMS provider: ${name}`);
  }
}
