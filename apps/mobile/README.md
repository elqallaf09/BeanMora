# BeanMora for Expo Go

## تشغيل على الهاتف

هذه واجهة React Native فعلية وليست عرض موقع Next.js داخل WebView. هذه نسخة موبايل أولية، وليست نقل كل صفحات الويب.

تحتاج كمبيوتر عليه Node.js 22.16 أو أحدث، واتصال إنترنت، وExpo Go المطابق لـ SDK 57 على الهاتف.

```sh
git clone https://github.com/elqallaf09/BeanMora.git
cd BeanMora/apps/mobile
npm ci
npm run setup
npx expo login
npm start
```

`setup` ينسخ فقط إعدادات Supabase العامة من `.env.local` في مشروع الويب إن وجدت، أو يطلب Publishable key. يمكن بدلاً منه وضع ملف `.env.local` المجهز في هذا المجلد. لا تضف أي مفتاح service_role / sb_secret ولا ترفعه إلى GitHub.

اتصل من الهاتف والكمبيوتر بنفس Wi-Fi. افتح Expo Go على أندرويد وامسح QR الظاهر في Terminal. على آيفون امسحه بكاميرا الهاتف. سجّل الدخول إلى Expo Go بنفس حساب `npx expo login`؛ مطلوب حاليًا على أجهزة iOS الفعلية. اترك Terminal والكمبيوتر يعملان.

عند حظر الشبكة للاتصال المحلي: أوقف السيرفر ثم `npm run tunnel` وامسح الرمز الجديد. قد يطلب Expo تثبيت أداة النفق. لا يوجد QR دائم مخزّن في المستودع، ولم يُنشر مشروع إلى EAS من هذه المحادثة.

## Included

- Native coffee and recipe catalogs, detail views and written recipe steps.
- Arabic/English UI, searchable loaded records and server-side brew-method filters.
- Existing BeanMora email/password login. Public browsing creates no anonymous account.
- Explainable recommendations from existing account preferences, equipment, inventory and latest own brew outcomes.
- Recording a real brew through the existing atomic `record_brew_outcome_v1` RPC, without positive defaults; private by default, optional explicit community consent.
- Loading/error/empty states, request cancellation guards, bounded queries and network timeouts.

Session tokens stay in memory, not on disk. Closing/reloading requires signing in again. Native persistent authentication, signup/reset/Google OAuth, background push notifications, full watchlist/admin, guided timers and device integrations are not included. OAuth and custom native modules need a development build, not a promise that Expo Go can run them. No EAS account/project or paid service has been created.

This preview reads the real BeanMora Supabase project only after local public configuration is supplied. Save is a real write initiated by the signed-in user. Browser tests use isolated synthetic fixtures and must never use production credentials. Missing stock/community evidence stays unknown. Mobile does not fetch public user-level community attempts in this release.

## Architecture and checks

`apps/mobile` has its own lockfile and React/Expo dependencies; the root web app is not converted into an npm workspace. Its TypeScript configuration excludes this directory. Core recommendation/outcome modules are exact snapshots of the web core. `npm test` checks for drift; run `npm run sync:core` after changing those modules. No database migration is needed.

```sh
npm run typecheck
npm test
npx expo install --check
npx expo-doctor
npm run export
```

Passing Metro iOS/Android exports verifies bundling, not physical-device operation. A web-preview browser test verifies rendered React Native Web UI, not native iOS/Android behavior. See the pull request for checks actually completed.

Reference docs (checked 2026-09-22): https://docs.expo.dev/get-started/start-developing/ , https://expo.dev/go , https://docs.expo.dev/guides/authentication/ , https://docs.expo.dev/guides/using-supabase/ .
