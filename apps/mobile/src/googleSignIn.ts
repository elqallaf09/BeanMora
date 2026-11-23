import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import type { SupabaseClient } from '@supabase/supabase-js';

export type NativeGoogleResult = 'signed-in' | 'cancelled';

// Public OAuth client ID for the iOS app (com.beanmora.mobile). It is listed in
// the Supabase Google provider's Client IDs so the ID token audience verifies.
// The matching reversed URL scheme is configured in app.json.
export const GOOGLE_IOS_CLIENT_ID =
  '728537769363-8a8kpqfr4mhg6lk5t8isjlqd1gs5ua5a.apps.googleusercontent.com';

let configured = false;

// Native Google Sign-In: Google's own account sheet says "continue to
// BeanMora" instead of the Supabase project domain. The free SDK cannot pass a
// custom nonce, so the Supabase Google provider has "Skip nonce checks" on.
export async function signInWithNativeGoogle(
  client: SupabaseClient,
): Promise<NativeGoogleResult> {
  if (!configured) {
    GoogleSignin.configure({ iosClientId: GOOGLE_IOS_CLIENT_ID });
    configured = true;
  }
  // Always offer the account chooser, matching prompt=select_account on web.
  try {
    await GoogleSignin.signOut();
  } catch {
    // Nothing to sign out of.
  }
  let idToken: string | null;
  try {
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return 'cancelled';
    idToken = response.data.idToken;
  } catch (cause) {
    if (isErrorWithCode(cause) && cause.code === statusCodes.IN_PROGRESS) return 'cancelled';
    throw cause;
  }
  if (!idToken) throw new Error('Google did not return an ID token.');
  const { error } = await client.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
  return 'signed-in';
}
