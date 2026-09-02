import { createHttpClient, requireEnv, type HttpClient } from '../http.ts';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingResponse,
} from './types.ts';

const VENDOR = 'openai';
const BASE_URL = 'https://api.openai.com/v1';

export interface OpenAIClient {
  http: HttpClient;
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  /** Convenience: returns the first choice's message content. */
  chatText(request: ChatCompletionRequest): Promise<string>;
  embed(input: string | string[], model?: string): Promise<number[][]>;
  /** Convenience: single embedding vector. */
  embedOne(input: string, model?: string): Promise<number[]>;
}

export function createOpenAIClient(apiKey?: string): OpenAIClient {
  const key = apiKey ?? requireEnv(VENDOR, 'OPENAI_API_KEY');

  const http = createHttpClient({
    vendor: VENDOR,
    baseUrl: BASE_URL,
    defaultHeaders: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    timeoutMs: 120_000,
    retries: 1,
  });

  async function chat(request: ChatCompletionRequest) {
    return await http.request<ChatCompletionResponse>('/chat/completions', {
      method: 'POST',
      body: request,
    });
  }

  async function embed(input: string | string[], model = 'text-embedding-3-small') {
    const data = await http.request<EmbeddingResponse>('/embeddings', {
      method: 'POST',
      body: { model, input },
    });
    return data.data.map((row) => row.embedding);
  }

  return {
    http,
    chat,
    chatText: async (request) => {
      const data = await chat(request);
      return data.choices?.[0]?.message?.content ?? '';
    },
    embed,
    embedOne: async (input, model) => (await embed(input, model))[0],
  };
}
