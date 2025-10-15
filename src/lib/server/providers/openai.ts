import { BaseProvider } from './base';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  CompletionRequest,
  CompletionResponse,
  Model,
  ProviderConfig,
  ProviderType,
  StreamChunk,
} from './types';

/**
 * OpenAI API provider implementation
 * Supports GPT-3.5, GPT-4, and other OpenAI models
 */
export class OpenAIProvider extends BaseProvider {
  private readonly DEFAULT_BASE_URL = 'https://api.openai.com/v1';

  constructor(config: ProviderConfig) {
    super(config);
  }

  getType(): ProviderType {
    return 'openai';
  }

  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
    };

    if (this.config.organization) {
      headers['OpenAI-Organization'] = this.config.organization;
    }

    return headers;
  }

  protected getBaseUrl(): string {
    return this.config.baseUrl || this.DEFAULT_BASE_URL;
  }

  async getModels(): Promise<Model[]> {
    const response = await this.fetch(`${this.getBaseUrl()}/models`, {
      method: 'GET',
    });

    const data = (await response.json()) as {
      data: Array<{ id: string; created: number }>;
    };

    // Map OpenAI models to our Model type with known metadata
    return data.data
      .filter((model) => model.id.includes('gpt'))
      .map((model) => this.mapOpenAIModel(model.id));
  }

  private mapOpenAIModel(modelId: string): Model {
    // Define known models with their properties
    const modelInfo: Record<
      string,
      { name: string; contextWindow: number; pricing?: Model['pricing'] }
    > = {
      'gpt-4': {
        name: 'GPT-4',
        contextWindow: 8192,
        pricing: { promptTokens: 30, completionTokens: 60 },
      },
      'gpt-4-turbo': {
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        pricing: { promptTokens: 10, completionTokens: 30 },
      },
      'gpt-4o': {
        name: 'GPT-4o',
        contextWindow: 128000,
        pricing: { promptTokens: 5, completionTokens: 15 },
      },
      'gpt-4o-mini': {
        name: 'GPT-4o Mini',
        contextWindow: 128000,
        pricing: { promptTokens: 0.15, completionTokens: 0.6 },
      },
      'gpt-3.5-turbo': {
        name: 'GPT-3.5 Turbo',
        contextWindow: 16385,
        pricing: { promptTokens: 0.5, completionTokens: 1.5 },
      },
    };

    // Find the best match for the model
    let info = modelInfo[modelId];
    if (!info) {
      // Try to match partial model names
      const key = Object.keys(modelInfo).find((k) => modelId.startsWith(k));
      info = key ? modelInfo[key] : undefined;
    }

    return {
      id: modelId,
      name: info?.name || modelId,
      provider: 'openai',
      contextWindow: info?.contextWindow || 4096,
      supportsChat: true,
      supportsCompletion: modelId.includes('gpt-3.5'),
      pricing: info?.pricing,
    };
  }

  async createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    const response = await this.fetch(
      `${this.getBaseUrl()}/chat/completions`,
      {
        method: 'POST',
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          top_p: request.top_p,
          frequency_penalty: request.frequency_penalty,
          presence_penalty: request.presence_penalty,
          stop: request.stop,
          stream: false,
        }),
      },
    );

    const data = (await response.json()) as {
      id: string;
      model: string;
      choices: Array<{
        message: { content: string };
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    return {
      id: data.id,
      model: data.model,
      content: data.choices[0]?.message.content || '',
      finishReason: this.mapFinishReason(data.choices[0]?.finish_reason),
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  async *createChatCompletionStream(
    request: ChatCompletionRequest,
  ): AsyncGenerator<StreamChunk> {
    const response = await this.fetch(
      `${this.getBaseUrl()}/chat/completions`,
      {
        method: 'POST',
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          top_p: request.top_p,
          frequency_penalty: request.frequency_penalty,
          presence_penalty: request.presence_penalty,
          stop: request.stop,
          stream: true,
        }),
      },
    );

    for await (const line of this.parseSSEStream(response)) {
      try {
        const data = JSON.parse(line) as {
          choices: Array<{
            delta: { content?: string };
            finish_reason?: string;
          }>;
        };

        const choice = data.choices[0];
        if (!choice) continue;

        yield {
          delta: choice.delta.content || '',
          finishReason: choice.finish_reason
            ? this.mapFinishReason(choice.finish_reason)
            : undefined,
        };
      } catch {
        // Skip invalid JSON lines
        continue;
      }
    }
  }

  async createCompletion(
    request: CompletionRequest,
  ): Promise<CompletionResponse> {
    const response = await this.fetch(`${this.getBaseUrl()}/completions`, {
      method: 'POST',
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        stop: request.stop,
        stream: false,
      }),
    });

    const data = (await response.json()) as {
      id: string;
      model: string;
      choices: Array<{ text: string; finish_reason: string }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    return {
      id: data.id,
      model: data.model,
      text: data.choices[0]?.text || '',
      finishReason: this.mapFinishReason(data.choices[0]?.finish_reason),
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  async *createCompletionStream(
    request: CompletionRequest,
  ): AsyncGenerator<StreamChunk> {
    const response = await this.fetch(`${this.getBaseUrl()}/completions`, {
      method: 'POST',
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        stop: request.stop,
        stream: true,
      }),
    });

    for await (const line of this.parseSSEStream(response)) {
      try {
        const data = JSON.parse(line) as {
          choices: Array<{ text: string; finish_reason?: string }>;
        };

        const choice = data.choices[0];
        if (!choice) continue;

        yield {
          delta: choice.text || '',
          finishReason: choice.finish_reason
            ? this.mapFinishReason(choice.finish_reason)
            : undefined,
        };
      } catch {
        // Skip invalid JSON lines
        continue;
      }
    }
  }

  private mapFinishReason(
    reason: string | undefined,
  ): 'stop' | 'length' | 'content_filter' | null {
    if (!reason) return null;

    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return null;
    }
  }
}
