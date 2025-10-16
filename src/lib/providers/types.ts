/**
 * Common types for LLM provider abstraction layer
 */

export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface CompletionRequest {
  model: string;
  prompt: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
}

export interface CompletionResponse {
  id: string;
  model: string;
  text: string;
  finishReason: 'stop' | 'length' | 'content_filter' | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface Model {
  id: string;
  name: string;
  provider: ProviderType;
  contextWindow: number;
  supportsChat: boolean;
  supportsCompletion: boolean;
  pricing?: {
    promptTokens: number; // price per 1M tokens
    completionTokens: number; // price per 1M tokens
  };
}

export type ProviderType = 'openai' | 'anthropic' | 'openrouter' | 'custom';

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  customHeaders?: Record<string, string>;
}

export interface ConfigValuesDb {
  name: string;
  type: ProviderType;
  api_key: string;
  base_url: string | null;
  organization: string | null;
  custom_headers: string | null;
}

export interface StreamChunk {
  delta: string;
  finishReason?: 'stop' | 'length' | 'content_filter' | null;
}

export interface ProviderError extends Error {
  statusCode?: number;
  provider: ProviderType;
  originalError?: unknown;
}
