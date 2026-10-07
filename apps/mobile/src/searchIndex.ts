import type { CoffeeItem } from './data';
import { deepSearchText } from './core/deepSearch';

// Catalog records are immutable. A refresh or language change supplies new records.
// Weak keys allow old snapshots to be reclaimed and let screens share the index.
const documents = new WeakMap<CoffeeItem, string>();
export function indexedCoffeeSearchDocument(coffee: CoffeeItem): string {
  const cached = documents.get(coffee);
  if (cached !== undefined) return cached;
  const indexed = deepSearchText(coffeeSearchDocument(coffee));
  documents.set(coffee, indexed);
  return indexed;
}

export function coffeeSearchDocument(coffee: CoffeeItem): string {
  return [
    coffee.searchDocument,
    coffee.name,
    coffee.roaster,
    coffee.origin,
    coffee.description,
    coffee.process,
    coffee.variety,
    ...coffee.flavors,
  ]
    .filter(Boolean)
    .join(' ');
}
