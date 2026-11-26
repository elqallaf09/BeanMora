import type { ReactElement } from 'react';
import type { SocialMedia } from './core/community-social';

/** Browsers have no photo library to list; the composer offers the file picker instead. */
export const storyGalleryAvailable = false;
export function StoryGallery(_: {
  header: ReactElement; multiple: boolean; chosen: string[]; busy: boolean;
  onCamera: () => void; onPick: (key: string, load: () => Promise<SocialMedia>) => void;
}): ReactElement | null {
  return null;
}
