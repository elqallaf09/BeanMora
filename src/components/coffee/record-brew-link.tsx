"use client";
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
export function RecordBrewLink({ recipeId }: { recipeId: string }) {
  const t = useTranslations('brewOutcome');
  const pathname = usePathname();
  if (pathname.endsWith('/record')) return null;
  return <div className="mx-auto max-w-3xl px-4 pt-5 sm:px-6"><Button asChild variant="outline"><Link href={`/recipes/${recipeId}/record`}>{t('record')}</Link></Button></div>;
}
