import type { ImageSourcePropType } from 'react-native';

// An exact, source-linked product photo already approved in the catalog audit.
// Keep its source URI on the item; only this immutable photo gets a bundled copy.
const photos: Record<string, ImageSourcePropType> = {
  'https://images.squarespace-cdn.com/content/v1/5626184ce4b0581ff0294cfe/1593350415515-UAU8BG9WMUYTUTU2LK6P/image-asset.jpeg': require('../assets/catalog/crossbridge-oasis.png'),
};
export function catalogPhotoSource(uri: string): ImageSourcePropType {
  return photos[uri] ?? { uri };
}
