import { Platform } from 'react-native';
import { authRedirectForPlatform } from './core/native-oauth-callback';

export {
  cleanOAuthCallbackUrl,
  createOAuthCallbackHandler,
  nativeAuthRedirect,
  isEmailConfirmation,
  callbackFailureKind,
} from './core/native-oauth-callback';

export function getAuthRedirect() {
  // Native defines window as globalThis, but has no browser location. Return
  // before evaluating location.href for OAuth, signup and password recovery.
  if (Platform.OS !== 'web') return authRedirectForPlatform(Platform.OS);
  return authRedirectForPlatform(
    'web',
    typeof window === 'undefined' ? undefined : window.location.href,
  );
}
