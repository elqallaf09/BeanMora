import { expect, type Page } from '@playwright/test';
const languages = {ar:'العربية',en:'English',ja:'日本語',fr:'Français',it:'Italiano',es:'Español','pt-BR':'Português (Brasil)','zh-CN':'简体中文'};
const done = {ar:'تم',en:'Done',ja:'完了',fr:'Terminé',it:'Fine',es:'Listo','pt-BR':'Concluído','zh-CN':'完成'};
export async function setLanguage(page: Page, locale: keyof typeof languages) {
  await page.getByRole('button', { name: /^(الإعدادات|Settings|設定|Paramètres|Impostazioni|Configuración|Configurações|设置)$/, exact: true }).first().click();
  const panel = page.getByTestId('settings-screen');
  // RN Web mounts the controls before its modal slide-in finishes. A click
  // during that movement can focus a language pill without completing a press.
  // Wait for presentation, then still require one click to change the language.
  await expect(panel).toBeVisible();
  await expect.poll(() => panel.evaluate(node => {
    for (let current: Element | null = node; current; current = current.parentElement) {
      if (Number(getComputedStyle(current).opacity) < 1) return false;
      if (current.getAnimations().some(animation => animation.pending || animation.playState === 'running')) return false;
    }
    return true;
  })).toBe(true);
  await panel.getByRole('button', { name: languages[locale], exact: true }).click();
  await expect(panel.getByRole('button', { name: languages[locale], exact: true })).toHaveAttribute('aria-pressed', 'true');
  await panel.getByRole('button', { name: done[locale], exact: true }).click();
  await expect(panel).toHaveCount(0);
  // The Settings contents unmount before React Native Web finishes its closing
  // animation. Its focus trap stays active until the modal host also unmounts.
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
}
