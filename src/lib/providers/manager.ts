import { ProviderFactory } from './factory';
import type { IProvider } from './base';
import type {
  ProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  CompletionRequest,
  CompletionResponse,
  Model,
  StreamChunk,
} from './types';

/**
 * Manager for handling multiple providers and caching
 */
export class ProviderManager {
  private providers = new Map<string, IProvider>();
  private modelCache = new Map<string, Model[]>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  /**
   * Get or create a provider instance
   */
  getProvider(config: ProviderConfig): IProvider {
    const key = this.generateProviderKey(config);

    if (!this.providers.has(key)) {
      const provider = ProviderFactory.createProvider(config);
      this.providers.set(key, provider);
    }

    return this.providers.get(key)!;
  }

  /**
   * Get models from a provider with caching
   */
  async getModels(config: ProviderConfig, useCache = true): Promise<Model[]> {
    const key = this.generateProviderKey(config);

    if (useCache && this.isCacheValid(key)) {
      return this.modelCache.get(key)!;
    }

    const provider = this.getProvider(config);
    const models = await provider.getModels();

    this.modelCache.set(key, models);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);

    return models;
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    config: ProviderConfig,
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    const provider = this.getProvider(config);
    return provider.createChatCompletion(request);
  }

  /**
   * Create a chat completion with streaming
   */
  createChatCompletionStream(
    config: ProviderConfig,
    request: ChatCompletionRequest,
  ): AsyncGenerator<StreamChunk> {
    const provider = this.getProvider(config);
    return provider.createChatCompletionStream(request);
  }

  /**
   * Create a text completion
   */
  async createCompletion(
    config: ProviderConfig,
    request: CompletionRequest,
  ): Promise<CompletionResponse> {
    const provider = this.getProvider(config);
    return provider.createCompletion(request);
  }

  /**
   * Create a text completion with streaming
   */
  createCompletionStream(
    config: ProviderConfig,
    request: CompletionRequest,
  ): AsyncGenerator<StreamChunk> {
    const provider = this.getProvider(config);
    return provider.createCompletionStream(request);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.modelCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Clear cache for a specific provider
   */
  clearProviderCache(config: ProviderConfig): void {
    const key = this.generateProviderKey(config);
    this.modelCache.delete(key);
    this.cacheExpiry.delete(key);
  }

  /**
   * Remove a provider instance
   */
  removeProvider(config: ProviderConfig): void {
    const key = this.generateProviderKey(config);
    this.providers.delete(key);
    this.clearProviderCache(config);
  }

  /**
   * Generate a unique key for a provider configuration
   */
  private generateProviderKey(config: ProviderConfig): string {
    return `${config.type}:${config.baseUrl ?? 'default'}:${config.apiKey.slice(0, 8)}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(key: string): boolean {
    if (!this.modelCache.has(key) || !this.cacheExpiry.has(key)) {
      return false;
    }

    return Date.now() < this.cacheExpiry.get(key)!;
  }
}

// Singleton instance
export const providerManager = new ProviderManager();
