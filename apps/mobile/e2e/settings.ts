import { expect, type Page } from '@playwright/test';
const languages = {ar:'العربية',en:'English',ja:'日本語',fr:'Français',it:'Italiano',es:'Español','pt-BR':'Português (Brasil)','zh-CN':'简体中文'};
const done = {ar:'تم',en:'Done',ja:'完了',fr:'Terminé',it:'Fine',es:'Listo','pt-BR':'Concluído','zh-CN':'完成'};
export async function setLanguage(page: Page, locale: keyof typeof languages) {
  await page.getByRole('button', { name: /^(الإعدادات|Settings|設定|Paramètres|Impostazioni|Configuración|Configurações|设置)$/, exact: true }).first().click();
  const panel = page.getByTestId('settings-screen');
  await panel.getByRole('button', { name: languages[locale], exact: true }).click();
  await panel.getByRole('button', { name: done[locale], exact: true }).click();
  await expect(panel).toHaveCount(0);
  // The Settings contents unmount before React Native Web finishes its closing
  // animation. Its focus trap stays active until the modal host also unmounts.
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
}
