import type { ReactNode } from "react";

// Root layout only exists to satisfy the App Router; all real markup (html,
// body, fonts, direction) lives in src/app/[locale]/layout.tsx so it can
// react to the resolved locale. Next.js requires a root layout regardless.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
