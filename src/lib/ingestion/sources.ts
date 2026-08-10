/**
 * Permitted source registry.
 *
 * COMPLIANCE RULES ENCODED HERE — read before adding a source.
 *
 * 1. Every source declares an `accessMode` that states the legal basis on
 *    which we read it. The fetcher refuses any mode it has no compliant
 *    client for; there is deliberately no generic "scrape a page" mode.
 *
 * 2. Instagram and TikTok are ABSENT and must stay absent. Both prohibit
 *    automated collection in their terms; neither offers a content-search
 *    API we could use for this. Wanting the data does not create a right
 *    to take it.
 *
 * 3. Blog and publication sources are read through their PUBLISHED FEEDS.
 *    A feed is offered for syndication, which is what makes reading it
 *    acceptable — and it is also why we only take the parameters plus a
 *    link, never the article body.
 *
 * 4. Roaster sites are read only where robots.txt permits, at a slow rate,
 *    and ideally by partner agreement. `requiresPartnerAgreement` marks the
 *    ones we should not enable until someone has actually said yes.
 *
 * 5. Nothing here downloads images or video. We keep a remote URL for the
 *    review queue and that is all.
 */

export type AccessMode =
  | "rss"
  | "youtube_api"
  | "reddit_api"
  | "x_api"
  | "sitemap"
  | "partner_feed";

export type TrustTier = "official" | "editorial" | "community";

export interface SourceDefinition {
  slug: string;
  name: string;
  accessMode: AccessMode;
  /** Feed URL, or channel/subreddit/handle for API modes. */
  endpoint: string;
  siteUrl?: string;
  publisher?: string;
  country?: string;
  language?: "en" | "ar";
  trustTier: TrustTier;
  /** Seconds. The scheduler runs 3-hourly; this throttles further if needed. */
  minIntervalSeconds?: number;
  /** Env var that must be present for this source to run. */
  requiresEnv?: string;
  /** True where we should have an explicit agreement before enabling. */
  requiresPartnerAgreement?: boolean;
  notes?: string;
}

/* ------------------------------------------------------------------ */
/* Editorial publications — published RSS/Atom feeds                   */
/* ------------------------------------------------------------------ */

const PUBLICATIONS: SourceDefinition[] = [
  {
    slug: "sprudge",
    name: "Sprudge",
    accessMode: "rss",
    endpoint: "https://sprudge.com/feed",
    siteUrl: "https://sprudge.com",
    publisher: "Sprudge Media Network",
    trustTier: "editorial",
    notes: "Specialty coffee news and competition coverage.",
  },
  {
    slug: "perfect-daily-grind",
    name: "Perfect Daily Grind",
    accessMode: "rss",
    endpoint: "https://perfectdailygrind.com/feed/",
    siteUrl: "https://perfectdailygrind.com",
    publisher: "Perfect Daily Grind",
    trustTier: "editorial",
  },
  {
    slug: "coffee-chronicler",
    name: "The Coffee Chronicler",
    accessMode: "rss",
    endpoint: "https://coffeechronicler.com/feed/",
    siteUrl: "https://coffeechronicler.com",
    publisher: "The Coffee Chronicler",
    trustTier: "editorial",
    notes: "Frequently publishes explicit brew recipes with full parameters.",
  },
  {
    slug: "european-coffee-trip",
    name: "European Coffee Trip",
    accessMode: "rss",
    endpoint: "https://europeancoffeetrip.com/feed/",
    siteUrl: "https://europeancoffeetrip.com",
    publisher: "European Coffee Trip",
    trustTier: "editorial",
  },
  {
    slug: "barista-hustle",
    name: "Barista Hustle",
    accessMode: "rss",
    endpoint: "https://www.baristahustle.com/blog/feed/",
    siteUrl: "https://www.baristahustle.com",
    publisher: "Barista Hustle",
    trustTier: "editorial",
    notes: "Much of their material is paywalled course content — only the public feed is read.",
  },
];

/* ------------------------------------------------------------------ */
/* Roasters — feeds, partner-gated                                     */
/* ------------------------------------------------------------------ */

const ROASTERS: SourceDefinition[] = [
  {
    slug: "onyx-coffee-lab",
    name: "Onyx Coffee Lab",
    accessMode: "partner_feed",
    endpoint: "https://onyxcoffeelab.com/blogs/news.atom",
    siteUrl: "https://onyxcoffeelab.com",
    publisher: "Onyx Coffee Lab",
    country: "United States",
    trustTier: "official",
    requiresPartnerAgreement: true,
    notes: "Publishes per-lot brew recipes. Enable only with their agreement.",
  },
  {
    slug: "sey-coffee",
    name: "Sey Coffee",
    accessMode: "partner_feed",
    endpoint: "https://www.seycoffee.com/blogs/news.atom",
    siteUrl: "https://www.seycoffee.com",
    publisher: "Sey Coffee",
    country: "United States",
    trustTier: "official",
    requiresPartnerAgreement: true,
  },
  {
    slug: "coffee-collective",
    name: "The Coffee Collective",
    accessMode: "partner_feed",
    endpoint: "https://coffeecollective.dk/feed/",
    siteUrl: "https://coffeecollective.dk",
    publisher: "The Coffee Collective",
    country: "Denmark",
    trustTier: "official",
    requiresPartnerAgreement: true,
  },
  {
    slug: "la-cabra",
    name: "La Cabra",
    accessMode: "partner_feed",
    endpoint: "https://lacabra.dk/blogs/journal.atom",
    siteUrl: "https://lacabra.dk",
    publisher: "La Cabra",
    country: "Denmark",
    trustTier: "official",
    requiresPartnerAgreement: true,
  },
  {
    slug: "april-coffee",
    name: "April Coffee Roasters",
    accessMode: "partner_feed",
    endpoint: "https://aprilcoffeeroasters.com/blogs/news.atom",
    siteUrl: "https://aprilcoffeeroasters.com",
    publisher: "April Coffee Roasters",
    country: "Denmark",
    trustTier: "official",
    requiresPartnerAgreement: true,
  },
];

/* ------------------------------------------------------------------ */
/* Equipment makers — official brew guides                             */
/* ------------------------------------------------------------------ */

const MANUFACTURERS: SourceDefinition[] = [
  {
    slug: "fellow",
    name: "Fellow",
    accessMode: "partner_feed",
    endpoint: "https://fellowproducts.com/blogs/brew-guides.atom",
    siteUrl: "https://fellowproducts.com",
    publisher: "Fellow",
    trustTier: "official",
    requiresPartnerAgreement: true,
  },
  {
    slug: "cafec",
    name: "CAFEC",
    accessMode: "partner_feed",
    endpoint: "https://cafec-jp.com/feed/",
    siteUrl: "https://cafec-jp.com",
    publisher: "Sanyo Sangyo / CAFEC",
    country: "Japan",
    trustTier: "official",
    requiresPartnerAgreement: true,
  },
  {
    slug: "orea",
    name: "OREA Brewing",
    accessMode: "partner_feed",
    endpoint: "https://oreabrewing.com/blogs/news.atom",
    siteUrl: "https://oreabrewing.com",
    publisher: "OREA",
    trustTier: "official",
    requiresPartnerAgreement: true,
  },
];

/* ------------------------------------------------------------------ */
/* Credential-gated connectors — dormant until keys are configured     */
/* ------------------------------------------------------------------ */

const YOUTUBE: SourceDefinition[] = [
  {
    slug: "yt-james-hoffmann",
    name: "James Hoffmann (YouTube)",
    accessMode: "youtube_api",
    endpoint: "UCMb0O2CdPBNi-QqPk5T3gsQ",
    siteUrl: "https://www.youtube.com/@jameshoffmann",
    publisher: "James Hoffmann",
    trustTier: "editorial",
    requiresEnv: "YOUTUBE_API_KEY",
    notes: "Reads title + description via the Data API. Video itself is never copied or embedded as our content.",
  },
  {
    slug: "yt-lance-hedrick",
    name: "Lance Hedrick (YouTube)",
    accessMode: "youtube_api",
    endpoint: "UCSMBH8gO_o0zvbYCcqbQNHg",
    siteUrl: "https://www.youtube.com/@LanceHedrick",
    publisher: "Lance Hedrick",
    trustTier: "editorial",
    requiresEnv: "YOUTUBE_API_KEY",
  },
];

const REDDIT: SourceDefinition[] = [
  {
    slug: "r-coffee",
    name: "r/Coffee",
    accessMode: "reddit_api",
    endpoint: "Coffee",
    siteUrl: "https://www.reddit.com/r/Coffee/",
    trustTier: "community",
    requiresEnv: "REDDIT_CLIENT_ID",
  },
  {
    slug: "r-espresso",
    name: "r/espresso",
    accessMode: "reddit_api",
    endpoint: "espresso",
    siteUrl: "https://www.reddit.com/r/espresso/",
    trustTier: "community",
    requiresEnv: "REDDIT_CLIENT_ID",
  },
  {
    slug: "r-pourover",
    name: "r/pourover",
    accessMode: "reddit_api",
    endpoint: "pourover",
    siteUrl: "https://www.reddit.com/r/pourover/",
    trustTier: "community",
    requiresEnv: "REDDIT_CLIENT_ID",
  },
];

const X_SOURCES: SourceDefinition[] = [
  {
    slug: "x-coffee-recipes",
    name: "X — coffee recipe search",
    accessMode: "x_api",
    endpoint: "(v60 OR aeropress OR espresso) (recipe OR dose OR ratio) -is:retweet lang:en",
    trustTier: "community",
    requiresEnv: "X_API_BEARER_TOKEN",
    notes: "Requires a paid X API tier. Dormant until a token is configured.",
  },
];

export const SOURCE_REGISTRY: SourceDefinition[] = [
  ...PUBLICATIONS,
  ...ROASTERS,
  ...MANUFACTURERS,
  ...YOUTUBE,
  ...REDDIT,
  ...X_SOURCES,
];

/**
 * Explicitly blocked platforms. Kept as data (rather than as an unwritten
 * rule) so that adding one is a deliberate act someone has to argue for,
 * and so the reason travels with the code.
 */
export const BLOCKED_PLATFORMS: Array<{ platform: string; reason: string }> = [
  {
    platform: "instagram.com",
    reason:
      "Instagram's Terms of Use prohibit automated collection without written permission, and the Graph API exposes no content-search capability for this purpose.",
  },
  {
    platform: "tiktok.com",
    reason:
      "TikTok's Terms of Service prohibit scraping. The Research API is limited to approved academic institutions.",
  },
  {
    platform: "facebook.com",
    reason: "Same Meta automated-collection prohibition as Instagram.",
  },
  {
    platform: "pinterest.com",
    reason: "Terms prohibit automated collection; no suitable public content API.",
  },
];

export function isBlockedPlatform(url: string): { blocked: boolean; reason?: string } {
  const hit = BLOCKED_PLATFORMS.find((b) => url.toLowerCase().includes(b.platform));
  return hit ? { blocked: true, reason: hit.reason } : { blocked: false };
}

/** A source can run only when every env var it declares is present. */
export function isConfigured(source: SourceDefinition, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!source.requiresEnv) return true;
  return Boolean(env[source.requiresEnv]);
}

export function configuredSources(env: NodeJS.ProcessEnv = process.env): SourceDefinition[] {
  return SOURCE_REGISTRY.filter((s) => isConfigured(s, env) && !s.requiresPartnerAgreement);
}

export function dormantSources(env: NodeJS.ProcessEnv = process.env): SourceDefinition[] {
  return SOURCE_REGISTRY.filter((s) => !isConfigured(s, env) || s.requiresPartnerAgreement);
}
