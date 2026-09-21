import type { ReactNode } from 'react';
import { isUuid } from '@/lib/brewing/outcome';
import { RecordBrewLink } from '@/components/coffee/record-brew-link';

export default async function RecipeLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <>{isUuid(id) ? <RecordBrewLink recipeId={id} /> : null}{children}</>;
}
