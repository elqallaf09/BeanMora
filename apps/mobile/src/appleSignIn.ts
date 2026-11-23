import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export type NativeAppleResult = 'signed-in' | 'cancelled' | 'unavailable';

// Native Sign in with Apple shows Apple's own sheet (app name, icon, Face ID)
// instead of the "BeanMora wants to use <project>.supabase.co" web prompt.
// Supabase verifies the identity token against the bundle ID listed in the
// Apple provider's Client IDs, so no OAuth secret is needed for this path.
export async function signInWithNativeApple(
  client: SupabaseClient,
): Promise<NativeAppleResult> {
  if (!(await AppleAuthentication.isAvailableAsync())) return 'unavailable';
  const rawNonce = Crypto.randomUUID() + Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (cause) {
    if ((cause as { code?: string })?.code === 'ERR_REQUEST_CANCELED') {
      return 'cancelled';
    }
    throw cause;
  }
  if (!credential.identityToken) throw new Error('Apple did not return an identity token.');
  const { error } = await client.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  return 'signed-in';
}
