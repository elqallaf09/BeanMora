import type { ImageSourcePropType } from 'react-native';

// Publisher photography is allowed only by the data-layer permission gate.
// Held source photographs remain in research archives, outside the app bundle.
export function catalogPhotoSource(uri: string): ImageSourcePropType {
  return { uri };
}
