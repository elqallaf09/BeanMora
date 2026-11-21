export type SocialProvider = 'apple' | 'google';
export type ProviderSettings = Record<SocialProvider, boolean>;

export function visibleSocialProviders(
  platform: string,
  settings: ProviderSettings | null,
): SocialProvider[] {
  if (platform === 'ios') {
    if (!settings?.apple) return [];
    return settings.google ? ['apple', 'google'] : ['apple'];
  }
  return settings?.apple ? ['google', 'apple'] : ['google'];
}
