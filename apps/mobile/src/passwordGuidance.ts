import { authFailure } from './authFailure';

type Label = (ar: string, en: string) => string;

export function passwordHint(L: Label) {
  return L('استخدم 8 أحرف على الأقل. يمكنك اختيار عبارة من كلمات يسهل تذكرها.', 'Use at least 8 characters. You can use a few words you can remember.');
}

/** The server owns password policy. Never invent required character classes. */
export function passwordFailureMessage(error: unknown, L: Label): string | null {
  switch (authFailure(error).kind) {
    case 'passwordLength':
      return L('كلمة المرور قصيرة. استخدم 8 أحرف على الأقل.', 'This password is too short. Use at least 8 characters.');
    case 'weakPassword':
    case 'breachedPassword':
      return L('اختر كلمة مرور أقل شيوعًا. جرّب عبارة من كلمات يسهل تذكرها.', 'Choose a less common password. Try a few words you can remember.');
    case 'passwordPolicy':
      return L('كلمة المرور لا تطابق متطلبات الحساب الحالية. جرّب كلمة مرور أخرى.', 'This password does not match the current account requirements. Try another password.');
    default:
      return null;
  }
}
