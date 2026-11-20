// Six bounded turns may include assistant context. Worst-case JSON escaping
// of the allowed UTF-16 strings plus UUIDs fits below this explicit byte cap.
export const MAX_CONVERSATION_BODY_BYTES = 128 * 1024;

export async function boundedConversationJson(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('INVALID_INPUT');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_INPUT');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_CONVERSATION_BODY_BYTES) throw new Error('INVALID_INPUT');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const all = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(all));
}
