export interface StructuredModel {
  generate(name: string, schema: Record<string, unknown>, instructions: string, input: unknown): Promise<unknown>;
}

/** Server-only. No provider key, prompt or response body is logged. */
export function openAIModel(apiKey: string, model = 'gpt-4.1-mini', fetcher: typeof fetch = fetch): StructuredModel {
  return {
    async generate(name, schema, instructions, input) {
      const response = await fetcher('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(8500),
        body: JSON.stringify({
          model, store: false, max_output_tokens: 1200,
          instructions,
          input: [{ role: 'user', content: JSON.stringify(input) }],
          text: { format: { type: 'json_schema', name, strict: true, schema } },
        }),
      });
      if (!response.ok) throw new Error('MODEL_UNAVAILABLE');
      const data = await response.json();
      if (data.status !== 'completed') throw new Error('MODEL_INCOMPLETE');
      const parts = (data.output ?? []).flatMap((item: { type: string; content?: { type: string; text?: string }[] }) => item.type === 'message' ? item.content ?? [] : []);
      if (parts.some((part: { type: string }) => part.type === 'refusal')) throw new Error('MODEL_REFUSAL');
      const text = parts.filter((part: { type: string }) => part.type === 'output_text').map((part: { text?: string }) => part.text ?? '').join('');
      if (!text || text.length > 16000) throw new Error('MODEL_INVALID');
      return JSON.parse(text);
    },
  };
}
