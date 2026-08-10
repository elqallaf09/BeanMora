/**
 * Generated coffee artwork used wherever a bean, roaster, recipe, post, or
 * piece of gear has no real (rights-confirmed) photo yet.
 *
 * Per the product spec: never fabricate a branded coffee-bag photo, never
 * scrape imagery, and never fall back to a broken-image icon, an empty box,
 * or the same generic icon for every item. Instead each item gets a rich,
 * deterministic illustration generated from its own id/slug — a bag render,
 * latte-art cup, pour-over silhouette, bean scatter, roaster badge, or
 * equipment render — so a grid of unphotographed items still reads as
 * intentionally art-directed and every tile is visually distinct.
 *
 * Everything here is pure SVG with the BeanMora palette, rendered inline or
 * as a data URI. No network, no binary assets, no layout shift.
 */

export type ArtKind = "bag" | "cup" | "pourover" | "beans" | "roaster" | "post" | "gear" | "scene";

/* ------------------------------------------------------------------ */
/* Deterministic seeding                                               */
/* ------------------------------------------------------------------ */

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Small deterministic PRNG so one seed yields a stable series of values. */
function rng(seed: string) {
  let state = hashSeed(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

/** Warm BeanMora colourways — every palette stays on-brand. */
const PALETTES: Array<{ base: string; deep: string; accent: string; glow: string }> = [
  { base: "#D38746", deep: "#2B1812", accent: "#F8F0E4", glow: "#B85E2E" },
  { base: "#B85E2E", deep: "#2B1812", accent: "#F8F0E4", glow: "#D38746" },
  { base: "#1FA7A0", deep: "#123A38", accent: "#F8F0E4", glow: "#17847F" },
  { base: "#5A321E", deep: "#1C1714", accent: "#F8F0E4", glow: "#D38746" },
  { base: "#D38746", deep: "#5A321E", accent: "#FFFDF9", glow: "#1FA7A0" },
  { base: "#8C4A2F", deep: "#241109", accent: "#F8F0E4", glow: "#D38746" },
];

function paletteFor(seed: string) {
  return PALETTES[hashSeed(seed) % PALETTES.length];
}

/* ------------------------------------------------------------------ */
/* Shared SVG fragments                                                */
/* ------------------------------------------------------------------ */

/** A single coffee bean with its centre crease, at an arbitrary transform. */
function beanShape(cx: number, cy: number, r: number, rot: number, fill: string, opacity = 1) {
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})" opacity="${opacity}">
    <ellipse rx="${r}" ry="${r * 1.38}" fill="${fill}"/>
    <path d="M0 ${-r * 1.24} C ${r * 0.5} ${-r * 0.5}, ${r * 0.5} ${r * 0.5}, 0 ${r * 1.24}"
      stroke="rgba(0,0,0,0.32)" stroke-width="${Math.max(1, r * 0.19)}" fill="none" stroke-linecap="round"/>
  </g>`;
}

function steamPath(x: number, y: number, h: number, stroke: string, opacity: number) {
  return `<path d="M${x} ${y} c -5 ${-h * 0.28}, 5 ${-h * 0.46}, 0 ${-h * 0.72} c -4 ${-h * 0.18}, 3 ${-h * 0.24}, 0 ${-h * 0.34}"
    stroke="${stroke}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity="${opacity}"/>`;
}

function grain(seed: string, count: number, color: string) {
  const rand = rng(`${seed}-grain`);
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = rand() * 100;
    const y = rand() * 100;
    const r = 0.4 + rand() * 1.1;
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${0.05 + rand() * 0.12}"/>`;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Per-kind illustrations (100x100 user units, scaled by viewBox)       */
/* ------------------------------------------------------------------ */

// Rendered on a LIGHT backdrop (see LIGHT_BACKDROP) so the bag silhouette
// reads like studio product photography rather than a muddy dark rectangle.
function bagArt(seed: string): string {
  const p = paletteFor(seed);
  const rand = rng(seed);
  const tilt = -4 + rand() * 8;
  const stripe = rand() > 0.5;
  return `
    <rect width="100" height="100" fill="url(#bg)"/>
    ${grain(seed, 26, p.deep)}
    <ellipse cx="50" cy="88" rx="30" ry="5" fill="rgba(0,0,0,0.28)"/>
    <g transform="translate(50 52) rotate(${tilt}) translate(-50 -52)">
      <path d="M31 30 L69 30 L72 84 Q72 88 68 88 L32 88 Q28 88 28 84 Z" fill="${p.base}"/>
      <path d="M31 30 L50 30 L50 88 L32 88 Q28 88 28 84 Z" fill="rgba(255,255,255,0.10)"/>
      <path d="M31 30 L69 30 L70 39 L30 39 Z" fill="rgba(0,0,0,0.20)"/>
      <rect x="34" y="24" width="32" height="7" rx="2.4" fill="${p.deep}"/>
      <rect x="41" y="21" width="18" height="4" rx="2" fill="${p.deep}" opacity="0.75"/>
      ${stripe ? `<rect x="28" y="58" width="44" height="7" fill="${p.deep}" opacity="0.35"/>` : ""}
      <circle cx="50" cy="52" r="10.5" fill="${p.accent}" opacity="0.94"/>
      ${beanShape(50, 52, 4.6, 26, p.deep, 0.9)}
      <rect x="38" y="70" width="24" height="2.6" rx="1.3" fill="${p.accent}" opacity="0.55"/>
      <rect x="42" y="76" width="16" height="2.2" rx="1.1" fill="${p.accent}" opacity="0.38"/>
    </g>`;
}

function cupArt(seed: string): string {
  const p = paletteFor(seed);
  const rand = rng(seed);
  const leaves = 3 + Math.floor(rand() * 4);
  let art = "";
  for (let i = 0; i < leaves; i++) {
    const t = i / leaves;
    const ry = 4 + t * 11;
    art += `<ellipse cx="50" cy="${47 + t * 15}" rx="${16 - t * 8}" ry="${ry * 0.42}" fill="${p.accent}" opacity="${0.85 - t * 0.14}"/>`;
  }
  return `
    <rect width="100" height="100" fill="url(#bg)"/>
    ${grain(seed, 22, p.accent)}
    <ellipse cx="50" cy="86" rx="27" ry="4.5" fill="rgba(0,0,0,0.26)"/>
    <circle cx="50" cy="52" r="33" fill="${p.accent}" opacity="0.96"/>
    <circle cx="50" cy="52" r="28.5" fill="${p.deep}"/>
    <circle cx="50" cy="52" r="26" fill="${p.base}"/>
    <ellipse cx="44" cy="44" rx="12" ry="8" fill="${p.glow}" opacity="0.45"/>
    ${art}
    <path d="M24 52 q26 -16 52 0" stroke="${p.accent}" stroke-width="1.6" fill="none" opacity="0.4"/>
    ${steamPath(38, 16, 22, p.accent, 0.5)}
    ${steamPath(50, 12, 26, p.accent, 0.62)}
    ${steamPath(62, 16, 22, p.accent, 0.45)}`;
}

function pouroverArt(seed: string): string {
  const p = paletteFor(seed);
  const rand = rng(seed);
  const drops = 2 + Math.floor(rand() * 3);
  let dropArt = "";
  for (let i = 0; i < drops; i++) {
    dropArt += `<ellipse cx="50" cy="${66 + i * 7}" rx="1.5" ry="2.6" fill="${p.accent}" opacity="${0.6 - i * 0.14}"/>`;
  }
  return `
    <rect width="100" height="100" fill="url(#bg)"/>
    ${grain(seed, 20, p.accent)}
    ${steamPath(44, 24, 18, p.accent, 0.4)}
    ${steamPath(56, 22, 20, p.accent, 0.32)}
    <path d="M28 34 L72 34 L54 62 L46 62 Z" fill="${p.accent}" opacity="0.95"/>
    <path d="M28 34 L50 34 L50 62 L46 62 Z" fill="rgba(0,0,0,0.10)"/>
    <path d="M32 38 L68 38 L53 59 L47 59 Z" fill="${p.base}"/>
    <ellipse cx="50" cy="38" rx="18" ry="3.4" fill="${p.deep}" opacity="0.5"/>
    <rect x="47" y="62" width="6" height="5" fill="${p.accent}" opacity="0.85"/>
    ${dropArt}
    <path d="M32 78 L68 78 L64 92 Q64 95 61 95 L39 95 Q36 95 36 92 Z" fill="${p.accent}" opacity="0.92"/>
    <path d="M34 82 L66 82 L63 91 L37 91 Z" fill="${p.deep}" opacity="0.82"/>
    <path d="M68 80 q9 4 0 9" stroke="${p.accent}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.9"/>`;
}

function beansArt(seed: string): string {
  const p = paletteFor(seed);
  const rand = rng(seed);
  let scatter = "";
  const count = 9 + Math.floor(rand() * 5);
  for (let i = 0; i < count; i++) {
    const cx = 12 + rand() * 76;
    const cy = 14 + rand() * 72;
    const r = 5 + rand() * 4.5;
    const rot = rand() * 180;
    const shade = rand() > 0.55 ? p.deep : p.glow;
    scatter += beanShape(cx, cy, r, rot, shade, 0.72 + rand() * 0.28);
  }
  return `
    <rect width="100" height="100" fill="url(#bg)"/>
    <circle cx="26" cy="24" r="30" fill="${p.glow}" opacity="0.18"/>
    <circle cx="76" cy="78" r="26" fill="${p.accent}" opacity="0.10"/>
    ${scatter}
    ${grain(seed, 18, p.accent)}`;
}

function roasterArt(seed: string): string {
  const p = paletteFor(seed);
  const rand = rng(seed);
  const rays = 8 + Math.floor(rand() * 5);
  let burst = "";
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const x1 = 50 + Math.cos(a) * 27;
    const y1 = 50 + Math.sin(a) * 27;
    const x2 = 50 + Math.cos(a) * 39;
    const y2 = 50 + Math.sin(a) * 39;
    burst += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${p.accent}" stroke-width="2.4" opacity="0.4" stroke-linecap="round"/>`;
  }
  return `
    <rect width="100" height="100" fill="url(#bg)"/>
    ${grain(seed, 16, p.accent)}
    ${burst}
    <circle cx="50" cy="50" r="27" fill="${p.accent}" opacity="0.95"/>
    <circle cx="50" cy="50" r="23" fill="none" stroke="${p.deep}" stroke-width="1.6" opacity="0.55"/>
    <circle cx="50" cy="50" r="19" fill="${p.deep}"/>
    ${beanShape(50, 50, 8, 22, p.base, 1)}
    <path d="M31 74 q19 9 38 0" stroke="${p.accent}" stroke-width="2.2" fill="none" opacity="0.5" stroke-linecap="round"/>`;
}

function postArt(seed: string): string {
  const p = paletteFor(seed);
  const rand = rng(seed);
  const variant = Math.floor(rand() * 3);
  const inner =
    variant === 0
      ? `<circle cx="50" cy="46" r="24" fill="${p.accent}" opacity="0.94"/>
         <circle cx="50" cy="46" r="19" fill="${p.base}"/>
         <ellipse cx="44" cy="40" rx="9" ry="6" fill="${p.glow}" opacity="0.5"/>
         ${steamPath(50, 16, 18, p.accent, 0.45)}`
      : variant === 1
        ? `${beanShape(38, 44, 9, -20, p.deep, 0.92)}${beanShape(58, 52, 10, 30, p.glow, 0.92)}${beanShape(48, 66, 7, 6, p.deep, 0.7)}`
        : `<path d="M30 38 L70 38 L54 62 L46 62 Z" fill="${p.accent}" opacity="0.92"/>
           <path d="M34 42 L66 42 L52 59 L48 59 Z" fill="${p.base}"/>
           <ellipse cx="50" cy="76" rx="15" ry="4" fill="${p.accent}" opacity="0.55"/>`;
  return `
    <rect width="100" height="100" fill="url(#bg)"/>
    <circle cx="80" cy="20" r="22" fill="${p.glow}" opacity="0.22"/>
    <circle cx="18" cy="84" r="24" fill="${p.accent}" opacity="0.12"/>
    ${inner}
    ${grain(seed, 20, p.accent)}`;
}

// Rendered on a LIGHT backdrop (see LIGHT_BACKDROP), so every element here
// uses the dark/base end of the palette rather than cream.
function gearArt(seed: string): string {
  const p = paletteFor(seed);
  const rand = rng(seed);
  const teeth = 9 + Math.floor(rand() * 4);
  let cog = "";
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * 360;
    cog += `<rect x="47.5" y="13" width="5.5" height="11" rx="1.8" fill="${p.base}" opacity="0.9"
      transform="rotate(${a} 50 50)"/>`;
  }
  return `
    <rect width="100" height="100" fill="url(#bg)"/>
    ${grain(seed, 16, p.deep)}
    ${cog}
    <circle cx="50" cy="50" r="27" fill="${p.base}"/>
    <circle cx="50" cy="50" r="21" fill="${p.deep}"/>
    <circle cx="50" cy="50" r="12" fill="${p.base}" opacity="0.9"/>
    ${beanShape(50, 50, 5, 18, p.deep, 0.9)}`;
}

/**
 * Large-format editorial scene, for heroes and full-bleed features.
 *
 * The other renderers are icon-scale compositions that fall apart when
 * blown up to 600px — they become a flat brown wash. This one is built
 * for size: a raking warm light pool, a table plane with a cast shadow,
 * a hero vessel with crema and rim highlight, drifting steam, and beans
 * scattered in a shallow depth-of-field arrangement (larger and softer in
 * the foreground, smaller and sharper behind). Uses a 16:10 viewBox so it
 * composes as a landscape rather than a cropped square.
 */
function sceneArt(seed: string): string {
  const p = paletteFor(seed);
  const rand = rng(`${seed}-scene`);
  const variant = Math.floor(rand() * 3);

  // Foreground bean scatter with fake depth of field.
  let scatter = "";
  const n = 7 + Math.floor(rand() * 5);
  for (let i = 0; i < n; i++) {
    const near = rand();
    const cx = 6 + rand() * 148;
    const cy = 66 + rand() * 30;
    const r = 2.4 + near * 4.4;
    const rot = rand() * 180;
    const blur = near > 0.65 ? ' filter="url(#soft)"' : "";
    scatter += `<g${blur}>${beanShape(cx, cy, r, rot, p.deep, 0.5 + near * 0.45)}</g>`;
  }

  const vessel =
    variant === 0
      ? // Cup, three-quarter
        `<ellipse cx="80" cy="76" rx="26" ry="5" fill="#000" opacity="0.3" filter="url(#soft)"/>
         <path d="M58 44 h44 a3 3 0 0 1 3 3 l-3 22 a10 10 0 0 1 -10 8 h-24 a10 10 0 0 1 -10 -8 l-3 -22 a3 3 0 0 1 3 -3 z" fill="${p.accent}"/>
         <path d="M58 44 h22 v33 h-12 a10 10 0 0 1 -10 -8 l-3 -22 a3 3 0 0 1 3 -3 z" fill="#000" opacity="0.07"/>
         <ellipse cx="80" cy="45" rx="22" ry="6" fill="${p.deep}"/>
         <ellipse cx="80" cy="45" rx="19" ry="4.8" fill="${p.base}"/>
         <ellipse cx="74" cy="43.6" rx="7" ry="2.2" fill="${p.glow}" opacity="0.55"/>
         <path d="M103 50 q11 5 0 13" stroke="${p.accent}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`
      : variant === 1
        ? // Pour-over cone on a carafe
          `<ellipse cx="80" cy="80" rx="24" ry="4.5" fill="#000" opacity="0.3" filter="url(#soft)"/>
           <path d="M58 34 h44 l-17 26 h-10 z" fill="${p.accent}"/>
           <path d="M58 34 h22 l0 26 h-5 z" fill="#000" opacity="0.08"/>
           <ellipse cx="80" cy="34" rx="22" ry="5" fill="${p.deep}" opacity="0.55"/>
           <path d="M62 38 h36 l-14 20 h-8 z" fill="${p.base}"/>
           <rect x="77" y="60" width="6" height="5" fill="${p.accent}" opacity="0.85"/>
           <path d="M64 66 h32 l-4 14 a4 4 0 0 1 -4 3 h-16 a4 4 0 0 1 -4 -3 z" fill="${p.accent}" opacity="0.9"/>
           <path d="M66 70 h28 l-3 10 h-22 z" fill="${p.deep}" opacity="0.85"/>
           <ellipse cx="80" cy="63" rx="1.6" ry="2.8" fill="${p.accent}" opacity="0.7"/>`
        : // Bag, standing, hero-lit
          `<ellipse cx="80" cy="82" rx="24" ry="4.5" fill="#000" opacity="0.32" filter="url(#soft)"/>
           <path d="M64 30 h32 l3 50 a3 3 0 0 1 -3 3 h-32 a3 3 0 0 1 -3 -3 z" fill="${p.base}"/>
           <path d="M64 30 h16 v53 h-13 a3 3 0 0 1 -3 -3 z" fill="#fff" opacity="0.1"/>
           <path d="M64 30 h32 l0.6 9 h-33.2 z" fill="${p.deep}" opacity="0.35"/>
           <rect x="68" y="24" width="24" height="6" rx="2" fill="${p.deep}"/>
           <circle cx="80" cy="55" r="9" fill="${p.accent}" opacity="0.95"/>
           ${beanShape(80, 55, 4, 24, p.deep, 0.9)}`;

  return `
    <defs>
      <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="1.6"/>
      </filter>
      <radialGradient id="pool" cx="0.42" cy="0.3" r="0.62">
        <stop offset="0%" stop-color="${p.glow}" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="${p.glow}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="table" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${p.deep}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${p.deep}" stop-opacity="0.85"/>
      </linearGradient>
    </defs>

    <rect width="160" height="100" fill="url(#bg)"/>
    <rect width="160" height="100" fill="url(#pool)"/>

    <!-- table plane -->
    <rect y="62" width="160" height="38" fill="url(#table)"/>
    <path d="M0 62 h160" stroke="${p.accent}" stroke-width="0.5" opacity="0.16"/>

    <!-- soft background orbs for depth -->
    <circle cx="24" cy="22" r="20" fill="${p.accent}" opacity="0.07"/>
    <circle cx="138" cy="34" r="26" fill="${p.glow}" opacity="0.12"/>

    <!-- The vessel is lifted into the upper third and scaled down: on a tall
         phone viewport this landscape scene is cropped horizontally only, so
         vertical placement here is what keeps the subject clear of the
         headline and body copy that sit over the lower half. -->
    <g transform="translate(0 -16) scale(0.78)" transform-origin="80 40">
      ${steamPath(74, 30, 24, p.accent, 0.32)}
      ${steamPath(86, 26, 28, p.accent, 0.24)}
      ${vessel}
    </g>
    ${scatter}
    ${grain(seed, 34, p.accent)}`;
}

const RENDERERS: Record<ArtKind, (seed: string) => string> = {
  bag: bagArt,
  cup: cupArt,
  pourover: pouroverArt,
  beans: beansArt,
  roaster: roasterArt,
  post: postArt,
  gear: gearArt,
  scene: sceneArt,
};

/** Scene composes as a landscape; everything else is square. */
const VIEWBOX: Partial<Record<ArtKind, string>> = { scene: "0 0 160 100" };

/**
 * Scenes anchor to the TOP of the frame so the vessel rises into the upper
 * half and the darker table plane falls where the headline and body copy
 * sit. Centre-anchoring puts the vessel directly behind the type.
 */
const ASPECT_ANCHOR: Partial<Record<ArtKind, string>> = { scene: "xMidYMin slice" };

/** When no kind is given, pick one deterministically so a mixed grid varies. */
const AUTO_KINDS: ArtKind[] = ["bag", "cup", "pourover", "beans", "post"];

function resolveKind(seed: string, kind?: ArtKind): ArtKind {
  if (kind) return kind;
  return AUTO_KINDS[hashSeed(`${seed}-kind`) % AUTO_KINDS.length];
}

/**
 * Product-style kinds (a bag, a piece of gear) sit on a LIGHT backdrop so the
 * silhouette reads clearly, the way studio product photography would. The
 * atmospheric kinds (cup, pour-over, scatter) keep the dark, moody wash.
 * Without this split a dark bag rendered on a dark gradient just reads as a
 * muddy brown rectangle.
 */
const LIGHT_BACKDROP: ArtKind[] = ["bag", "gear"];

function buildSvg(seed: string, kind?: ArtKind): string {
  const p = paletteFor(seed);
  const resolved = resolveKind(seed, kind);
  const body = RENDERERS[resolved](seed);
  const light = LIGHT_BACKDROP.includes(resolved);

  const bg = light
    ? `<stop offset="0%" stop-color="#FFFDF9"/>
       <stop offset="55%" stop-color="${p.base}33"/>
       <stop offset="100%" stop-color="${p.base}66"/>`
    : `<stop offset="0%" stop-color="${p.base}"/>
       <stop offset="55%" stop-color="${p.glow}"/>
       <stop offset="100%" stop-color="${p.deep}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX[resolved] ?? "0 0 100 100"}" preserveAspectRatio="${ASPECT_ANCHOR[resolved] ?? "xMidYMid slice"}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      ${bg}
    </linearGradient>
  </defs>
  ${body}
</svg>`;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Data-URI artwork, usable directly as an <img src> or CSS background-image. */
export function coffeeArt(seed: string, kind?: ArtKind): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(buildSvg(seed, kind))}`;
}

/** Back-compat alias for the earlier abstract-only helper. */
export const abstractCoffeeArt = coffeeArt;

/**
 * Inline illustration filling its container. Used for card and hero imagery
 * where an <img> would add an unnecessary data-URI decode.
 */
export function CoffeeArt({
  seed,
  kind,
  className,
}: {
  seed: string;
  kind?: ArtKind;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        backgroundImage: `url("${coffeeArt(seed, kind)}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}

/**
 * Rich gradient + pattern surface for large hero areas. Layers a soft radial
 * wash over a warm base and (optionally) a faint bean motif, so heroes read as
 * designed photography-substitutes rather than flat colour blocks.
 */
export function AbstractCoffeeBackground({
  seed,
  className,
  children,
  pattern = true,
}: {
  seed: string;
  className?: string;
  children?: React.ReactNode;
  pattern?: boolean;
}) {
  const p = paletteFor(seed);
  const rand = rng(`${seed}-hero`);
  const x1 = 15 + rand() * 25;
  const y1 = 12 + rand() * 22;
  const x2 = 60 + rand() * 30;
  const y2 = 62 + rand() * 28;

  const motif = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      ${beanShape(30, 34, 9, -24, p.accent, 0.13)}
      ${beanShape(88, 62, 11, 32, p.accent, 0.1)}
      ${beanShape(56, 96, 8, 8, p.accent, 0.11)}
    </svg>`,
  );

  return (
    <div
      className={className}
      style={{
        backgroundColor: p.deep,
        backgroundImage: [
          pattern ? `url("data:image/svg+xml;utf8,${motif}")` : null,
          `radial-gradient(circle at ${x1}% ${y1}%, ${p.base}dd, transparent 58%)`,
          `radial-gradient(circle at ${x2}% ${y2}%, ${p.glow}bb, transparent 62%)`,
          `linear-gradient(135deg, ${p.base}, ${p.deep})`,
        ]
          .filter(Boolean)
          .join(", "),
      }}
    >
      {children}
    </div>
  );
}
