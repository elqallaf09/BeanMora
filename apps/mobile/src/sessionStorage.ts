// Browser sessions use Supabase's browser storage. Native resolves .native.ts.
import type { createSecureSessionStorage } from './core/secure-session-storage';
export const sessionStorage:
  ReturnType<typeof createSecureSessionStorage> | undefined = undefined;
