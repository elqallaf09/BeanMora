import type { CoffeeItem } from './data';

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
