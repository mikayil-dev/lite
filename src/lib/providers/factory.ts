import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { OpenRouterProvider } from './openrouter';
import type { IProvider } from './base';
import type { ProviderConfig, ProviderType } from './types';

/**
 * Factory for creating provider instances
 */
export class ProviderFactory {
  /**
   * Create a provider instance based on the configuration
   */
  static createProvider(config: ProviderConfig): IProvider {
    switch (config.type) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'openrouter':
        return new OpenRouterProvider(config);
      case 'custom':
        // For custom providers, use OpenAI-compatible API
        return new OpenAIProvider(config);
      default: {
        const _exhaustiveCheck: never = config.type;
        throw new Error(`Unsupported provider type: ${String(config.type)}`);
      }
    }
  }

  /**
   * Get list of supported provider types
   */
  static getSupportedProviders(): ProviderType[] {
    return ['openai', 'anthropic', 'openrouter', 'custom'];
  }

  /**
   * Validate provider configuration
   */
  static validateConfig(config: ProviderConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.type) {
      errors.push('Provider type is required');
    } else if (!this.getSupportedProviders().includes(config.type)) {
      errors.push(`Unsupported provider type: ${config.type}`);
    }

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    if (config.type === 'custom' && !config.baseUrl) {
      errors.push('Base URL is required for custom providers');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
