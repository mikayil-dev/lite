import type { ProviderConfig, Model, ChatCompletionRequest, StreamChunk } from '$lib/providers/types';
import type { ProviderData } from './providers';
import { ProviderFactory } from '$lib/providers/factory';

/**
 * Get models from a provider (calls external API)
 */
export async function getModelsForProvider(provider: ProviderData): Promise<Model[]> {
  const config: ProviderConfig = {
    type: provider.type,
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
    organization: provider.organization,
    customHeaders: provider.customHeaders,
  };

  const providerInstance = ProviderFactory.createProvider(config);
  return providerInstance.getModels();
}

/**
 * Create a chat completion stream (calls external API)
 */
export async function* createChatStream(
  provider: ProviderData,
  request: ChatCompletionRequest,
): AsyncGenerator<StreamChunk> {
  const config: ProviderConfig = {
    type: provider.type,
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
    organization: provider.organization,
    customHeaders: provider.customHeaders,
  };

  const providerInstance = ProviderFactory.createProvider(config);
  yield* providerInstance.createChatCompletionStream(request);
}
