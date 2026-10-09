import type { Metadata } from 'next';
import './global-not-found.css';

export const metadata: Metadata = {
  title: '404 · BeanMora',
  description: 'الصفحة غير موجودة · Page not found',
};

// Unmatched paths bypass the locale layout, so this fallback owns its document.
export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body className="beanmora-not-found">
        <main>
          <p className="brand" dir="ltr">BeanMora · 404</p>
          <h1>الصفحة غير موجودة</h1>
          <p>يمكنك الرجوع للرئيسية ومواصلة استكشاف القهوة.</p>
          <p lang="en" dir="ltr">This page could not be found. Return home to explore coffee.</p>
          <nav aria-label="العودة للرئيسية">
            <a href="/ar">الرئيسية</a>
            <a href="/en" lang="en" dir="ltr">Return home</a>
          </nav>
        </main>
      </body>
    </html>
  );
}
