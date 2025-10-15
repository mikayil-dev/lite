/**
 * Provider abstraction layer for LLM APIs
 * Supports OpenAI, Anthropic, OpenRouter, and custom providers
 */

// Export types
export type {
  MessageRole,
  Message,
  ChatCompletionRequest,
  ChatCompletionResponse,
  CompletionRequest,
  CompletionResponse,
  Model,
  ProviderType,
  ProviderConfig,
  StreamChunk,
  ProviderError,
} from './types';

// Export base classes and interfaces
export { BaseProvider, type IProvider } from './base';

// Export provider implementations
export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
export { OpenRouterProvider } from './openrouter';

// Export factory and manager
export { ProviderFactory } from './factory';
export { ProviderManager, providerManager } from './manager';

// Export database operations
export { ProviderDB } from './db';
