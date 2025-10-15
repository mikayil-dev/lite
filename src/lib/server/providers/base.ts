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
 * Interface that all LLM providers must implement
 */
export interface IProvider {
  /**
   * Get the provider type
   */
  getType(): ProviderType;

  /**
   * Get available models from this provider
   */
  getModels(): Promise<Model[]>;

  /**
   * Create a chat completion
   */
  createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse>;

  /**
   * Create a chat completion with streaming
   */
  createChatCompletionStream(
    request: ChatCompletionRequest,
  ): AsyncGenerator<StreamChunk>;

  /**
   * Create a text completion (legacy)
   */
  createCompletion(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Create a text completion with streaming (legacy)
   */
  createCompletionStream(
    request: CompletionRequest,
  ): AsyncGenerator<StreamChunk>;
}

/**
 * Abstract base class for all providers
 * Handles common functionality like error handling and request formatting
 */
export abstract class BaseProvider implements IProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Validate provider configuration
   */
  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error(`API key is required for ${this.config.type} provider`);
    }
  }

  /**
   * Get the provider type
   */
  abstract getType(): ProviderType;

  /**
   * Get available models from this provider
   */
  abstract getModels(): Promise<Model[]>;

  /**
   * Create a chat completion
   */
  abstract createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse>;

  /**
   * Create a chat completion with streaming
   */
  abstract createChatCompletionStream(
    request: ChatCompletionRequest,
  ): AsyncGenerator<StreamChunk>;

  /**
   * Create a text completion (legacy)
   */
  abstract createCompletion(
    request: CompletionRequest,
  ): Promise<CompletionResponse>;

  /**
   * Create a text completion with streaming (legacy)
   */
  abstract createCompletionStream(
    request: CompletionRequest,
  ): AsyncGenerator<StreamChunk>;

  /**
   * Make an HTTP request with error handling
   */
  protected async fetch(url: string, options: RequestInit): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...this.config.customHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return response;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        error,
      );
    }
  }

  /**
   * Get authentication headers for this provider
   */
  protected abstract getAuthHeaders(): Record<string, string>;

  /**
   * Get the base URL for API requests
   */
  protected abstract getBaseUrl(): string;

  /**
   * Handle error responses from the API
   */
  protected async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `API request failed with status ${response.status}`;

    try {
      const errorData = (await response.json()) as {
        error?: { message: string };
        message?: string;
      };
      errorMessage =
        errorData.error?.message ?? errorData.message ?? errorMessage;
    } catch {
      // If we can't parse the error as JSON, use the status text
      errorMessage = response.statusText || errorMessage;
    }

    throw this.createError(errorMessage, null, response.status);
  }

  /**
   * Create a provider-specific error
   */
  protected createError(
    message: string,
    originalError?: unknown,
    statusCode?: number,
  ): Error {
    const error = new Error(message) as Error & {
      statusCode?: number;
      provider: ProviderType;
      originalError?: unknown;
    };
    error.statusCode = statusCode;
    error.provider = this.getType();
    error.originalError = originalError;
    return error;
  }

  /**
   * Parse Server-Sent Events (SSE) stream
   */
  protected async *parseSSEStream(response: Response): AsyncGenerator<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw this.createError('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            yield data;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
