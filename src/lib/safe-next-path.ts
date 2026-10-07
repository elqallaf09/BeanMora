/** Only accept same-origin absolute paths, after URL normalization. */
export function safeNextPath(
  value: string | null,
  fallback = '/home',
): `/${string}` {
  const safeFallback = fallback as `/${string}`;
  if (!value || !value.startsWith('/') || value.startsWith('//'))
    return safeFallback;
  // Reject raw/encoded slashes, backslashes and controls which proxies or a
  // second decoder could reinterpret as an external URL.
  if (
    /[\\\u0000-\u0020\u007f]/.test(value) ||
    /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f|25)/i.test(value)
  )
    return safeFallback;
  try {
    const base = 'https://internal.invalid';
    const url = new URL(value, base);
    if (
      url.origin !== base ||
      url.username ||
      url.password ||
      url.pathname.startsWith('//')
    )
      return safeFallback;
    return `${url.pathname}${url.search}${url.hash}` as `/${string}`;
  } catch {
    return safeFallback;
  }
}
