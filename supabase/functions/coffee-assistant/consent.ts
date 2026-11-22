// Protocol and policy are separate: old clients have no safe history boundary.
export const COFFEE_CONSENT_POLICY = 'openai-v1';
export const COFFEE_CONSENT_HEADER = 'x-coffee-consent';
export const COFFEE_CONSENT_API = 3;
export type ConsentReceipt = { choice: 'allow' | 'guide'; generation: string };
export class CoffeeConsentRequired extends Error {
  constructor() { super('COFFEE_CONSENT_REQUIRED'); }
}
export function requireCoffeeConsent(receipt: ConsentReceipt | null, generation: string | null) {
  if (!generation || receipt?.choice !== 'allow' || receipt.generation !== generation) throw new CoffeeConsentRequired();
}
