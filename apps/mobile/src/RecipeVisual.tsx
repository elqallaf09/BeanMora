import { View } from './native';
import type { RecipeItem } from './data';
import { CoffeePhoto } from './CoffeePhoto';
import { MethodPhoto, hasMethodPhoto } from './MethodPhoto';

export function RecipeVisual({ recipe }: { recipe: RecipeItem }) {
  return <View testID="recipe-photo" style={{ flex: 1, minHeight: 100 }}>
    <CoffeePhoto uri={recipe.coverUrl} uris={recipe.coffeeImages}
      fallback={recipe.method !== 'xbloom' && hasMethodPhoto(recipe.method) ? <MethodPhoto method={recipe.method} /> : undefined} />
  </View>;
}
