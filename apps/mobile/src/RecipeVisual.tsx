import { View } from 'react-native';
import type { RecipeItem } from './data';
import { CoffeePhoto } from './CoffeeScreens';
import { Icon, colors } from './ui';
import { MethodPhoto, hasMethodPhoto } from './MethodPhoto';
import { useContentMedia } from './useContentMedia';

export function RecipeVisual({ recipe }: { recipe: RecipeItem }) {
  const cover = useContentMedia(recipe.coverUrl);
  if (cover)
    return (
      <CoffeePhoto
        uri={cover}
        kind={recipe.coverKind}
        seed={recipe.id}
        fallback={
          hasMethodPhoto(recipe.method) ? (
            <MethodPhoto method={recipe.method} />
          ) : undefined
        }
      />
    );
  if (hasMethodPhoto(recipe.method))
    return <MethodPhoto method={recipe.method} />;
  // A method illustration avoids presenting an unrelated coffee bag as a recipe photo.
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.chip,
      }}
    >
      <View
        style={{
          backgroundColor: colors.paper,
          borderRadius: 70,
          width: 110,
          height: 110,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={recipe.method} size={64} color={colors.brown} />
      </View>
    </View>
  );
}
