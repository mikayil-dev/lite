/**
 * Example usage of the provider abstraction layer
 * This file demonstrates how to integrate the provider system in your SvelteKit application
 */

import { ProviderDB } from './db';
import { providerManager } from './manager';
import type { ProviderConfig, ChatCompletionRequest } from './types';

/**
 * Example 1: Simple chat completion
 */
export async function simpleChat(): Promise<ChatCompletionResponse> {
  const config: ProviderConfig = {
    type: 'openai',
    apiKey: process.env.OPENAI_API_KEY ?? '',
  };

  const request: ChatCompletionRequest = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is the capital of France?' },
    ],
    temperature: 0.7,
    max_tokens: 150,
  };

  const response = await providerManager.createChatCompletion(config, request);
  console.log('Response:', response.content);
  console.log('Tokens used:', response.usage?.totalTokens);

  return response;
}

/**
 * Example 2: Streaming chat completion
 */
export async function streamingChat(): Promise<string> {
  const config: ProviderConfig = {
    type: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
  };

  const request: ChatCompletionRequest = {
    model: 'claude-3-5-sonnet-20241022',
    messages: [{ role: 'user', content: 'Write a haiku about programming.' }],
    max_tokens: 1024,
  };

  const stream = providerManager.createChatCompletionStream(config, request);

  let fullResponse = '';
  for await (const chunk of stream) {
    fullResponse += chunk.delta;
    process.stdout.write(chunk.delta);

    if (chunk.finishReason) {
      console.log('\nFinish reason:', chunk.finishReason);
    }
  }

  return fullResponse;
}

/**
 * Example 3: Using database-stored provider configuration
 */
export async function chatWithStoredProvider(
  chatId: string,
  userMessage: string,
): Promise<ChatCompletionResponse> {
  // Get the default provider from the database
  const providerConfig = await ProviderDB.getDefault();

  if (!providerConfig) {
    throw new Error('No default provider configured');
  }

  // Get chat history from database
  const messageHistory = await ProviderDB.getMessages(chatId);

  // Create the request with message history
  const request: ChatCompletionRequest = {
    model: 'gpt-4o',
    messages: [
      ...messageHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ],
  };

  // Save user message
  await ProviderDB.saveMessage({
    chatId,
    role: 'user',
    content: userMessage,
  });

  // Get response
  const response = await providerManager.createChatCompletion(
    providerConfig,
    request,
  );

  // Save assistant response
  await ProviderDB.saveMessage({
    chatId,
    role: 'assistant',
    content: response.content,
    model: response.model,
    providerId: providerConfig.id,
    tokensPrompt: response.usage?.promptTokens,
    tokensCompletion: response.usage?.completionTokens,
  });

  // Update model preference
  await ProviderDB.updateModelPreference(
    providerConfig.id,
    response.model,
    response.model,
  );

  return response;
}

/**
 * Example 4: Multi-provider comparison
 */
export async function compareProviders(prompt: string): Promise<Array<{
  provider: string;
  model?: string;
  response?: string;
  tokens?: number;
  duration?: number;
  error?: string;
}>> {
  const providers = [
    {
      type: 'openai' as const,
      apiKey: process.env.OPENAI_API_KEY ?? '',
      model: 'gpt-4o-mini',
    },
    {
      type: 'anthropic' as const,
      apiKey: process.env.ANTHROPIC_API_KEY ?? '',
      model: 'claude-3-5-haiku-20241022',
    },
    {
      type: 'openrouter' as const,
      apiKey: process.env.OPENROUTER_API_KEY ?? '',
      model: 'meta-llama/llama-3.1-8b-instruct:free',
    },
  ];

  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      const startTime = Date.now();

      const response = await providerManager.createChatCompletion(
        { type: provider.type, apiKey: provider.apiKey },
        {
          model: provider.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 100,
        },
      );

      const duration = Date.now() - startTime;

      return {
        provider: provider.type,
        model: provider.model,
        response: response.content,
        tokens: response.usage?.totalTokens,
        duration,
      };
    }),
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      const error = result.reason as Error;
      return {
        provider: providers[index].type,
        error: error.message,
      };
    }
  });
}

/**
 * Example 5: Getting and caching models
 */
export async function listAvailableModels(
  providerType: 'openai' | 'anthropic' | 'openrouter',
): Promise<Array<{
  id: string;
  name: string;
  contextWindow: number;
  pricing?: { promptTokens: number; completionTokens: number };
}>> {
  const apiKeyMap = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  };

  const config: ProviderConfig = {
    type: providerType,
    apiKey: apiKeyMap[providerType] ?? '',
  };

  // First call - fetches from API
  console.time('First fetch');
  const models1 = await providerManager.getModels(config);
  console.timeEnd('First fetch');

  // Second call - returns from cache
  console.time('Cached fetch');
  const _models2 = await providerManager.getModels(config);
  console.timeEnd('Cached fetch');

  return models1.map((model) => ({
    id: model.id,
    name: model.name,
    contextWindow: model.contextWindow,
    pricing: model.pricing,
  }));
}

/**
 * Example 6: SvelteKit API Route Handler
 *
 * Create this as: src/routes/api/chat/+server.ts
 */
export async function handleChatRequest(requestBody: {
  message: string;
  chatId: string;
  providerId?: number;
}): Promise<{
  stream: AsyncGenerator<StreamChunk>;
  saveResponse: (fullResponse: string, model: string, usage?: { promptTokens: number; completionTokens: number }) => Promise<void>;
}> {
  const { message, chatId, providerId } = requestBody;

  // Get provider config
  let providerConfig;
  if (providerId) {
    providerConfig = await ProviderDB.getById(providerId);
  } else {
    providerConfig = await ProviderDB.getDefault();
  }

  if (!providerConfig) {
    throw new Error('No provider configuration found');
  }

  // Get message history
  const history = await ProviderDB.getMessages(chatId);

  // Save user message
  await ProviderDB.saveMessage({
    chatId,
    role: 'user',
    content: message,
  });

  // Create request
  const request: ChatCompletionRequest = {
    model: 'gpt-4o', // Could be dynamic based on user preference
    messages: [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ],
  };

  // Get streaming response
  const stream = providerManager.createChatCompletionStream(
    providerConfig,
    request,
  );

  return {
    stream,
    async saveResponse(
      fullResponse: string,
      model: string,
      usage?: { promptTokens: number; completionTokens: number },
    ) {
      await ProviderDB.saveMessage({
        chatId,
        role: 'assistant',
        content: fullResponse,
        model,
        providerId: providerConfig.id,
        tokensPrompt: usage?.promptTokens,
        tokensCompletion: usage?.completionTokens,
      });
    },
  };
}
