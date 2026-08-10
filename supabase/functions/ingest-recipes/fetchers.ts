/**
 * Source fetchers.
 *
 * One fetcher per access mode. Each returns normalised `FetchedItem`s and
 * nothing else — no page bodies are retained beyond the short excerpt the
 * moderator needs, and no media is downloaded.
 *
 * The credential-gated fetchers (YouTube, Reddit, X) are fully implemented
 * against their official APIs but throw `MissingCredentialsError` until the
 * corresponding env var is set. They are wired up and dormant, not stubbed:
 * adding the key is the only step needed to activate them.
 */

import type { SourceDefinition } from "./sources";
import { isBlockedPlatform } from "./sources";

export interface FetchedItem {
  externalId: string;
  url: string;
  title: string | null;
  authorName: string | null;
  authorUrl: string | null;
  publishedAt: string | null;
  /** Remote URL only — never downloaded. */
  imageUrl: string | null;
  /** Full text handed to the extractor. NOT persisted; only the 500-char excerpt is. */
  text: string;
}

export interface FetchResult {
  items: FetchedItem[];
  etag?: string | null;
  lastModified?: string | null;
  /** True when the server answered 304 and there is nothing new. */
  notModified?: boolean;
}

export class MissingCredentialsError extends Error {
  constructor(public readonly envVar: string) {
    super(`Missing ${envVar}. This connector stays dormant until it is configured.`);
    this.name = "MissingCredentialsError";
  }
}

export class BlockedSourceError extends Error {
  constructor(url: string, reason: string) {
    super(`Refusing to fetch ${url}: ${reason}`);
    this.name = "BlockedSourceError";
  }
}

const USER_AGENT =
  "BeanMoraBot/1.0 (+https://beanmora.app/bot; recipe parameter indexing; contact: hello@beanmora.app)";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function tagText(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  const raw = m[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1");
  return stripTags(raw) || null;
}

/** First image URL referenced in the entry, kept as a remote link only. */
function firstImageUrl(xml: string): string | null {
  return (
    xml.match(/<media:content[^>]+url="([^"]+)"/i)?.[1] ??
    xml.match(/<enclosure[^>]+url="([^"]+)"[^>]*type="image/i)?.[1] ??
    xml.match(/<img[^>]+src="([^"]+)"/i)?.[1] ??
    null
  );
}

/* ------------------------------------------------------------------ */
/* robots.txt                                                          */
/* ------------------------------------------------------------------ */

/**
 * Minimal robots.txt check for our own user-agent and `*`. Deliberately
 * conservative: any parse failure or network error is treated as
 * "disallowed" rather than "allowed".
 */
export async function robotsAllows(targetUrl: string): Promise<boolean> {
  try {
    const u = new URL(targetUrl);
    const res = await fetch(`${u.origin}/robots.txt`, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    // No robots.txt at all means no restrictions were expressed.
    if (res.status === 404) return true;
    if (!res.ok) return false;

    const body = await res.text();
    const lines = body.split(/\r?\n/).map((l) => l.trim());

    let applies = false;
    const disallowed: string[] = [];
    for (const line of lines) {
      const ua = line.match(/^user-agent:\s*(.+)$/i);
      if (ua) {
        const agent = ua[1].trim().toLowerCase();
        applies = agent === "*" || agent.includes("beanmora");
        continue;
      }
      if (!applies) continue;
      const dis = line.match(/^disallow:\s*(.*)$/i);
      if (dis) {
        const path = dis[1].trim();
        if (path) disallowed.push(path);
      }
    }
    return !disallowed.some((p) => u.pathname.startsWith(p));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* RSS / Atom                                                          */
/* ------------------------------------------------------------------ */

export async function fetchRss(
  source: SourceDefinition,
  conditional?: { etag?: string | null; lastModified?: string | null },
): Promise<FetchResult> {
  const blocked = isBlockedPlatform(source.endpoint);
  if (blocked.blocked) throw new BlockedSourceError(source.endpoint, blocked.reason!);

  const headers: Record<string, string> = { "user-agent": USER_AGENT, accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" };
  // Conditional requests keep repeat runs cheap for the publisher.
  if (conditional?.etag) headers["if-none-match"] = conditional.etag;
  if (conditional?.lastModified) headers["if-modified-since"] = conditional.lastModified;

  const res = await fetch(source.endpoint, { headers, signal: AbortSignal.timeout(20_000) });
  if (res.status === 304) return { items: [], notModified: true };
  if (!res.ok) throw new Error(`${source.slug}: HTTP ${res.status}`);

  const xml = await res.text();

  // Handles both RSS <item> and Atom <entry>.
  const blocks = [
    ...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi),
  ].map((m) => m[0]);

  const items: FetchedItem[] = [];
  for (const block of blocks) {
    const link =
      block.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i)?.[1] ??
      block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ??
      tagText(block, "link");
    if (!link) continue;

    const title = tagText(block, "title");
    // Prefer the fuller body field when present — more parameters to find.
    const body =
      tagText(block, "content:encoded") ??
      tagText(block, "content") ??
      tagText(block, "description") ??
      tagText(block, "summary") ??
      "";

    items.push({
      externalId: tagText(block, "guid") ?? tagText(block, "id") ?? link,
      url: link,
      title,
      authorName:
        tagText(block, "dc:creator") ?? tagText(block, "author") ?? source.publisher ?? null,
      authorUrl: source.siteUrl ?? null,
      publishedAt: tagText(block, "pubDate") ?? tagText(block, "published") ?? tagText(block, "updated"),
      imageUrl: firstImageUrl(block),
      text: [title, body].filter(Boolean).join(". "),
    });
  }

  return {
    items,
    etag: res.headers.get("etag"),
    lastModified: res.headers.get("last-modified"),
  };
}

/* ------------------------------------------------------------------ */
/* YouTube Data API v3 — dormant until YOUTUBE_API_KEY is set          */
/* ------------------------------------------------------------------ */

export async function fetchYouTube(source: SourceDefinition): Promise<FetchResult> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new MissingCredentialsError("YOUTUBE_API_KEY");

  // Titles + descriptions only. We never download or re-host the video, and
  // playback (if we ever surface it) must go through YouTube's own embed so
  // their terms and the creator's monetisation are respected.
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("key", key);
  url.searchParams.set("channelId", source.endpoint);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("order", "date");
  url.searchParams.set("maxResults", "25");
  url.searchParams.set("type", "video");

  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${source.slug}: YouTube API HTTP ${res.status}`);
  const json = (await res.json()) as {
    items?: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        description: string;
        publishedAt: string;
        channelTitle: string;
        thumbnails?: { high?: { url: string } };
      };
    }>;
  };

  return {
    items: (json.items ?? []).map((v) => ({
      externalId: v.id.videoId,
      url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
      title: v.snippet.title,
      authorName: v.snippet.channelTitle,
      authorUrl: source.siteUrl ?? null,
      publishedAt: v.snippet.publishedAt,
      imageUrl: v.snippet.thumbnails?.high?.url ?? null,
      text: `${v.snippet.title}. ${v.snippet.description}`,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Reddit API — dormant until REDDIT_CLIENT_ID/SECRET are set          */
/* ------------------------------------------------------------------ */

async function redditToken(): Promise<string> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id) throw new MissingCredentialsError("REDDIT_CLIENT_ID");
  if (!secret) throw new MissingCredentialsError("REDDIT_CLIENT_SECRET");

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Reddit auth failed: HTTP ${res.status}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export async function fetchReddit(source: SourceDefinition): Promise<FetchResult> {
  const token = await redditToken();
  const res = await fetch(`https://oauth.reddit.com/r/${source.endpoint}/new?limit=50`, {
    headers: { authorization: `Bearer ${token}`, "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${source.slug}: Reddit API HTTP ${res.status}`);

  const json = (await res.json()) as {
    data?: { children?: Array<{ data: Record<string, unknown> }> };
  };

  return {
    items: (json.data?.children ?? []).map((c) => {
      const d = c.data as {
        id: string;
        permalink: string;
        title: string;
        selftext?: string;
        author?: string;
        created_utc?: number;
      };
      return {
        externalId: d.id,
        url: `https://www.reddit.com${d.permalink}`,
        title: d.title,
        authorName: d.author ? `u/${d.author}` : null,
        authorUrl: d.author ? `https://www.reddit.com/user/${d.author}` : null,
        publishedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : null,
        // Reddit image URLs are not retained — user-posted media has the
        // most uncertain rights position of any source here.
        imageUrl: null,
        text: `${d.title}. ${d.selftext ?? ""}`,
      };
    }),
  };
}

/* ------------------------------------------------------------------ */
/* X API — dormant until X_API_BEARER_TOKEN is set                     */
/* ------------------------------------------------------------------ */

export async function fetchX(source: SourceDefinition): Promise<FetchResult> {
  const token = process.env.X_API_BEARER_TOKEN;
  if (!token) throw new MissingCredentialsError("X_API_BEARER_TOKEN");

  const url = new URL("https://api.twitter.com/2/tweets/search/recent");
  url.searchParams.set("query", source.endpoint);
  url.searchParams.set("max_results", "50");
  url.searchParams.set("tweet.fields", "created_at,author_id,text");

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${source.slug}: X API HTTP ${res.status}`);

  const json = (await res.json()) as {
    data?: Array<{ id: string; text: string; created_at?: string; author_id?: string }>;
  };

  return {
    items: (json.data ?? []).map((tw) => ({
      externalId: tw.id,
      url: `https://x.com/i/status/${tw.id}`,
      title: null,
      authorName: tw.author_id ? `x:${tw.author_id}` : null,
      authorUrl: null,
      publishedAt: tw.created_at ?? null,
      imageUrl: null,
      text: tw.text,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Dispatch                                                            */
/* ------------------------------------------------------------------ */

export async function fetchSource(
  source: SourceDefinition,
  conditional?: { etag?: string | null; lastModified?: string | null },
): Promise<FetchResult> {
  switch (source.accessMode) {
    case "rss":
    case "partner_feed":
      return fetchRss(source, conditional);
    case "youtube_api":
      return fetchYouTube(source);
    case "reddit_api":
      return fetchReddit(source);
    case "x_api":
      return fetchX(source);
    case "sitemap": {
      // Sitemap crawling is gated on an explicit robots.txt check every run,
      // not just at registration time.
      if (!(await robotsAllows(source.endpoint))) {
        throw new BlockedSourceError(source.endpoint, "robots.txt disallows this path");
      }
      return fetchRss(source, conditional);
    }
    default: {
      // Exhaustiveness guard: a new access mode must get a compliant client
      // here before it can ever run.
      const never: never = source.accessMode;
      throw new Error(`No compliant fetcher for access mode: ${String(never)}`);
    }
  }
}
