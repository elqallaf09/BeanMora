type Options = { signal?: AbortSignal | null; timeoutMs?: number };

/** A deadline must settle even when the native transport ignores cancellation. */
export async function withDeadline<T>(
  run: (signal: AbortSignal) => PromiseLike<T>,
  { signal, timeoutMs = 12000 }: Options = {},
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectDeadline: (error: Error) => void = () => {};
  const stop = (name: string) => {
    controller.abort();
    const error = new Error(
      name === 'AbortError' ? 'Request cancelled' : 'Request timed out',
    );
    error.name = name;
    rejectDeadline(error);
  };
  const abort = () => stop('AbortError');
  const deadline = new Promise<never>((_, reject) => {
    rejectDeadline = reject;
  });
  try {
    signal?.addEventListener('abort', abort);
    if (signal?.aborted) {
      abort();
      return await deadline;
    }
    timer = setTimeout(() => stop('TimeoutError'), timeoutMs);
    return await Promise.race([
      Promise.resolve().then(() => run(controller.signal)),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

/** Cover headers AND the complete body; Supabase consumes JSON after fetch returns. */
export const boundedFetch: typeof fetch = (input, init) =>
  withDeadline(
    async (signal) => {
      const response = await fetch(input, { ...init, signal });
      if (
        init?.method?.toUpperCase() === 'HEAD' ||
        [204, 205, 304].includes(response.status)
      )
        return response;
      // React Native's ArrayBuffer-to-text polyfill does not decode UTF-8.
      // Read text as text so Arabic JSON survives; preserve binary Storage bytes.
      const contentType = response.headers.get('content-type') ?? '';
      const body = /json|^text\/|xml|javascript|x-www-form-urlencoded/i.test(
        contentType,
      )
        ? await response.text()
        : await response.arrayBuffer();
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    },
    { signal: init?.signal },
  );
