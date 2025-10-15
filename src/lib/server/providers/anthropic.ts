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
  Message,
} from './types';

/**
 * Anthropic API provider implementation
 * Supports Claude models (Claude 3, Claude 3.5, etc.)
 */
export class AnthropicProvider extends BaseProvider {
  private readonly DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';
  private readonly ANTHROPIC_VERSION = '2023-06-01';

  constructor(config: ProviderConfig) {
    super(config);
  }

  getType(): ProviderType {
    return 'anthropic';
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      'x-api-key': this.config.apiKey,
      'anthropic-version': this.ANTHROPIC_VERSION,
    };
  }

  protected getBaseUrl(): string {
    return this.config.baseUrl ?? this.DEFAULT_BASE_URL;
  }

  // Anthropic doesn't have a models endpoint, so we return a static list
  // eslint-disable-next-line @typescript-eslint/require-await
  async getModels(): Promise<Model[]> {
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        contextWindow: 200000,
        supportsChat: true,
        supportsCompletion: false,
        pricing: { promptTokens: 3, completionTokens: 15 },
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        contextWindow: 200000,
        supportsChat: true,
        supportsCompletion: false,
        pricing: { promptTokens: 1, completionTokens: 5 },
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        contextWindow: 200000,
        supportsChat: true,
        supportsCompletion: false,
        pricing: { promptTokens: 15, completionTokens: 75 },
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        contextWindow: 200000,
        supportsChat: true,
        supportsCompletion: false,
        pricing: { promptTokens: 3, completionTokens: 15 },
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        contextWindow: 200000,
        supportsChat: true,
        supportsCompletion: false,
        pricing: { promptTokens: 0.25, completionTokens: 1.25 },
      },
    ];
  }

  async createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    const { system, messages } = this.formatMessages(request.messages);

    const response = await this.fetch(`${this.getBaseUrl()}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        model: request.model,
        messages,
        system,
        max_tokens: request.max_tokens ?? 4096,
        temperature: request.temperature,
        top_p: request.top_p,
        stop_sequences: Array.isArray(request.stop)
          ? request.stop
          : request.stop
            ? [request.stop]
            : undefined,
        stream: false,
      }),
    });

    const data = (await response.json()) as {
      id: string;
      model: string;
      content: Array<{ type: string; text: string }>;
      stop_reason: string;
      usage: {
        input_tokens: number;
        output_tokens: number;
      };
    };

    return {
      id: data.id,
      model: data.model,
      content: data.content[0]?.text || '',
      finishReason: this.mapStopReason(data.stop_reason),
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  }

  async *createChatCompletionStream(
    request: ChatCompletionRequest,
  ): AsyncGenerator<StreamChunk> {
    const { system, messages } = this.formatMessages(request.messages);

    const response = await this.fetch(`${this.getBaseUrl()}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        model: request.model,
        messages,
        system,
        max_tokens: request.max_tokens ?? 4096,
        temperature: request.temperature,
        top_p: request.top_p,
        stop_sequences: Array.isArray(request.stop)
          ? request.stop
          : request.stop
            ? [request.stop]
            : undefined,
        stream: true,
      }),
    });

    for await (const line of this.parseSSEStream(response)) {
      try {
        const data = JSON.parse(line) as
          | {
              type: 'content_block_delta';
              delta: { type: 'text_delta'; text: string };
            }
          | {
              type: 'message_delta';
              delta: { stop_reason: string };
            }
          | { type: string };

        if (data.type === 'content_block_delta' && 'delta' in data) {
          yield {
            delta: data.delta.text,
          };
        } else if (data.type === 'message_delta' && 'delta' in data) {
          yield {
            delta: '',
            finishReason: this.mapStopReason(data.delta.stop_reason),
          };
        }
      } catch {
        // Skip invalid JSON lines
        continue;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async createCompletion(
    _request: CompletionRequest,
  ): Promise<CompletionResponse> {
    throw this.createError(
      'Text completions are not supported by Anthropic. Use chat completions instead.',
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async *createCompletionStream(
    _request: CompletionRequest,
  ): AsyncGenerator<StreamChunk> {
    throw this.createError(
      'Text completions are not supported by Anthropic. Use chat completions instead.',
    );
  }

  /**
   * Format messages for Anthropic API
   * Anthropic requires system messages to be in a separate field
   */
  private formatMessages(messages: Message[]): {
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    return {
      system:
        systemMessages.length > 0
          ? systemMessages.map((m) => m.content).join('\n\n')
          : undefined,
      messages: conversationMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    };
  }

  private mapStopReason(
    reason: string | undefined,
  ): 'stop' | 'length' | 'content_filter' | null {
    if (!reason) return null;

    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'stop_sequence':
        return 'stop';
      default:
        return null;
    }
  }
}
