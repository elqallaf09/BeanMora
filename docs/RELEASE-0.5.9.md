# BeanMora 0.5.9

The tablet screenshots showed a language selector stretched across the header,
a large empty fixed area above the home page, and small content below it.

- Bound the language control to 104 × 52 logical pixels, with two 48 × 44
  touch targets, so it cannot stretch with its parent.
- Keep the app bar at 68 logical pixels, reserve room for its actions, and use
  the compact logo below 600 pixels.
- Move the home category rail and connection notice into the page's scroll
  content. Only the compact app bar and bottom navigation remain fixed.
- Use two, three, or four coffee columns based on available space. Enlarge
  supporting text and navigation labels; allow statistic labels to wrap.
- Limit the bottom navigation's content width on tablets so its actions do
  not spread across the full landscape display.

Validation: mobile TypeScript and existing mobile checks passed; Metro exports
for Android, iOS, and web passed; eight isolated browser tests passed, including
320, 390, 768, 1024 × 600, and 1536 pixel layouts, language persistence, scroll
reachability, details, and account navigation. These are React Native Web tests,
not a physical Huawei tablet or iPhone test.

Release identifiers: app 0.5.9, Android versionCode 19, iOS buildNumber 2.
The previous iOS 0.5.8 (1) was built and uploaded to App Store Connect. Updating
the code does not change that uploaded binary; 0.5.9 needs its own signed build
and submission.
