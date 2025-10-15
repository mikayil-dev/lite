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
 * OpenRouter API provider implementation
 * OpenRouter provides access to multiple AI models through a unified API
 */
export class OpenRouterProvider extends BaseProvider {
  private readonly DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

  constructor(config: ProviderConfig) {
    super(config);
  }

  getType(): ProviderType {
    return 'openrouter';
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'HTTP-Referer': this.config.customHeaders?.['HTTP-Referer'] || '',
      'X-Title': this.config.customHeaders?.['X-Title'] || 'Lite',
    };
  }

  protected getBaseUrl(): string {
    return this.config.baseUrl || this.DEFAULT_BASE_URL;
  }

  async getModels(): Promise<Model[]> {
    const response = await this.fetch(`${this.getBaseUrl()}/models`, {
      method: 'GET',
    });

    const data = (await response.json()) as {
      data: Array<{
        id: string;
        name: string;
        context_length: number;
        pricing: {
          prompt: string;
          completion: string;
        };
      }>;
    };

    return data.data.map((model) => ({
      id: model.id,
      name: model.name,
      provider: 'openrouter',
      contextWindow: model.context_length,
      supportsChat: true,
      supportsCompletion: true,
      pricing: {
        // OpenRouter prices are per token, convert to per 1M tokens
        promptTokens: parseFloat(model.pricing.prompt) * 1000000,
        completionTokens: parseFloat(model.pricing.completion) * 1000000,
      },
    }));
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
