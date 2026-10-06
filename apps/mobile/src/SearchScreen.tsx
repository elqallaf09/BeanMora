import { useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { supabase } from './client';
import { loadRoasters, countryLabel, type RoasterItem } from './catalog';
import type { CoffeeItem, RecipeItem } from './data';
import {
  deepSearchText,
  matchesDeepSearch,
  matchesIndexedSearch,
} from './core/deepSearch';
import { coffeeSearchDocument } from './searchIndex';
import { CoffeeCard, SectionTitle } from './CoffeeScreens';
import { RecipeCatalog } from './RecipeCatalog';
import { Action, Language, Txt, colors, styles } from './ui';

export function SearchScreen({
  coffees,
  openCoffee,
  openRecipe,
  openRoaster,
  browseCoffees,
  browseRoasters,
  savedIds,
  saveCoffee,
}: {
  coffees: CoffeeItem[];
  savedIds: string[];
  saveCoffee: (coffee: CoffeeItem) => void;
  openCoffee: (coffee: CoffeeItem) => void;
  openRecipe: (recipe: RecipeItem) => void;
  openRoaster: (roaster: RoasterItem) => void;
  browseCoffees: (query: string) => void;
  browseRoasters: (query: string) => void;
}) {
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const { width } = useWindowDimensions();
  const [roasters, setRoasters] = useState<RoasterItem[]>([]);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError(false);
    if (!supabase) {
      setBusy(false);
      return;
    }
    void loadRoasters(supabase, locale)
      .then((rows) => {
        if (active) setRoasters(rows);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [locale, revision]);
  // Compile the public catalog once, instead of translating every note on each keystroke.
  const indexed = useMemo(
    () =>
      coffees
        .filter((c) => c.published && c.reviewed)
        .map((coffee) => ({
          coffee,
          text: deepSearchText(coffeeSearchDocument(coffee)),
        })),
    [coffees],
  );
  const renderResults = (query: string) => {
    const matches = indexed
      .filter((row) => matchesIndexedSearch(row.text, query))
      .map((row) => row.coffee);
    const matchedRoasters = new Set(matches.map((c) => c.roasterId));
    const roasterMatches = roasters.filter(
      (r) =>
        matchesDeepSearch(
          [
            r.searchDocument,
            r.name,
            r.description,
            countryLabel(r.country, locale),
          ].join(' '),
          query,
        ) ||
        (query.trim() && matchedRoasters.has(r.id)),
    );
    const columns = width >= 600 ? 3 : 2;
    const cardWidth =
      (Math.min(width, 1120) - 36 - (columns - 1) * 12) / columns;
    return (
      <View testID="universal-search-results" style={{ gap: 12 }}>
        <SectionTitle
          title={`${ar ? 'البن والإيحاءات' : 'Coffees & tasting notes'} · ${matches.length}`}
        />
        <View
          style={{
            flexDirection: ar ? 'row-reverse' : 'row',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {matches.slice(0, columns * 2).map((c) => (
            <CoffeeCard
              key={c.kind + c.id}
              item={c}
              width={cardWidth}
              saved={savedIds.includes(c.beanId ?? c.id)}
              open={() => openCoffee(c)}
              save={() => saveCoffee(c)}
            />
          ))}
        </View>
        {!matches.length ? (
          <Txt style={styles.muted}>
            {ar
              ? 'لا يوجد بن مطابق في الكتالوغ الحالي.'
              : 'No matching coffee in the current catalog.'}
          </Txt>
        ) : null}
        <Action
          title={ar ? 'عرض كل نتائج البن' : 'View all coffee results'}
          onPress={() => browseCoffees(query)}
        />
        <SectionTitle
          title={`${ar ? 'المحامص' : 'Roasters'} · ${roasterMatches.length}`}
        />
        <View style={{ gap: 8 }}>
          {roasterMatches.slice(0, 4).map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={r.name}
              onPress={() => openRoaster(r)}
              style={[styles.card, { padding: 14 }]}
            >
              <Txt style={{ fontWeight: '700' }}>{r.name}</Txt>
              <Txt style={styles.muted}>{countryLabel(r.country, locale)}</Txt>
              {query.trim() && matchedRoasters.has(r.id) ? (
                <Txt style={{ color: colors.teal, fontSize: 12 }}>
                  {ar
                    ? 'لديها بن بإيحاءات تطابق بحثك'
                    : 'Has coffee matching your search'}
                </Txt>
              ) : null}
            </Pressable>
          ))}
        </View>
        {busy ? (
          <Txt style={styles.muted}>
            {ar ? 'جارٍ تحميل المحامص…' : 'Loading roasters…'}
          </Txt>
        ) : null}
        {error ? (
          <Action
            title={ar ? 'إعادة تحميل المحامص' : 'Retry roasters'}
            onPress={() => setRevision((v) => v + 1)}
          />
        ) : null}
        <Action
          title={ar ? 'عرض كل نتائج المحامص' : 'View all roaster results'}
          onPress={() => browseRoasters(query)}
        />
        <SectionTitle title={ar ? 'الوصفات المطابقة' : 'Matching recipes'} />
        <Txt style={styles.muted}>
          {ar
            ? 'فلاتر التحضير والتقديم أدناه تخص الوصفات. الوصفات تبحث في المكتبة كاملة.'
            : 'Brew and serving filters apply to recipes. Recipes search the full library.'}
        </Txt>
      </View>
    );
  };
  return (
    <RecipeCatalog universal open={openRecipe} searchResults={renderResults} />
  );
}
