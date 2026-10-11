import { Platform } from 'react-native';
import { authRedirectForPlatform } from './core/native-oauth-callback';

export {
  cleanOAuthCallbackUrl,
  createOAuthCallbackHandler,
  nativeAuthRedirect,
} from './core/native-oauth-callback';

export function getAuthRedirect() {
  return authRedirectForPlatform(
    Platform.OS,
    typeof window === 'undefined' ? undefined : window.location.href,
  );
}
