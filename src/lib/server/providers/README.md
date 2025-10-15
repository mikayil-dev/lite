# Provider Abstraction Layer

A unified, provider-agnostic interface for interacting with multiple LLM APIs including OpenAI, Anthropic, OpenRouter, and custom providers.

## Features

- **Provider-agnostic**: Single interface for multiple LLM providers
- **Streaming support**: Built-in streaming for real-time responses
- **Type-safe**: Full TypeScript support with comprehensive types
- **Caching**: Automatic model caching with configurable TTL
- **Error handling**: Consistent error handling across all providers
- **Database integration**: Store and manage provider configurations

## Supported Providers

- **OpenAI**: GPT-3.5, GPT-4, GPT-4 Turbo, GPT-4o
- **Anthropic**: Claude 3 (Opus, Sonnet, Haiku), Claude 3.5
- **OpenRouter**: Access to multiple models through unified API
- **Custom**: Any OpenAI-compatible API endpoint

## Quick Start

### Basic Usage

```typescript
import { providerManager } from '$lib/server/providers';

// Create a chat completion
const response = await providerManager.createChatCompletion(
  {
    type: 'openai',
    apiKey: 'sk-...',
  },
  {
    model: 'gpt-4o',
    messages: [
      { role: 'user', content: 'Hello, how are you?' }
    ],
  }
);

console.log(response.content);
```

### Streaming Responses

```typescript
const stream = providerManager.createChatCompletionStream(
  {
    type: 'anthropic',
    apiKey: 'sk-ant-...',
  },
  {
    model: 'claude-3-5-sonnet-20241022',
    messages: [
      { role: 'user', content: 'Write a story about a robot.' }
    ],
  }
);

for await (const chunk of stream) {
  process.stdout.write(chunk.delta);
}
```

### Getting Available Models

```typescript
const models = await providerManager.getModels({
  type: 'openai',
  apiKey: 'sk-...',
});

models.forEach(model => {
  console.log(\`\${model.name} - \${model.contextWindow} tokens\`);
});
```

## Database Integration

### Storing Provider Configurations

```typescript
import { ProviderDB } from '$lib/server/providers/db';

// Create a new provider configuration
const providerId = await ProviderDB.create({
  name: 'My OpenAI Config',
  type: 'openai',
  apiKey: 'sk-...',
  organization: 'org-...',
}, true); // Set as default

// Get the default provider
const defaultProvider = await ProviderDB.getDefault();

// Use the stored configuration
if (defaultProvider) {
  const response = await providerManager.createChatCompletion(
    defaultProvider,
    {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello!' }],
    }
  );
}
```

### Saving Messages

```typescript
// Save a message to the database
await ProviderDB.saveMessage({
  chatId: 'chat-123',
  role: 'assistant',
  content: response.content,
  model: 'gpt-4o',
  providerId: defaultProvider.id,
  tokensPrompt: response.usage?.promptTokens,
  tokensCompletion: response.usage?.completionTokens,
});

// Retrieve messages for a chat
const messages = await ProviderDB.getMessages('chat-123');
```

## Provider-Specific Configuration

### OpenAI

```typescript
const config = {
  type: 'openai' as const,
  apiKey: 'sk-...',
  organization: 'org-...', // Optional
  baseUrl: 'https://api.openai.com/v1', // Optional, for custom endpoints
};
```

### Anthropic

```typescript
const config = {
  type: 'anthropic' as const,
  apiKey: 'sk-ant-...',
  // System messages are automatically extracted and formatted
};
```

### OpenRouter

```typescript
const config = {
  type: 'openrouter' as const,
  apiKey: 'sk-or-...',
  customHeaders: {
    'HTTP-Referer': 'https://your-app.com',
    'X-Title': 'Your App Name',
  },
};
```

### Custom Provider

```typescript
const config = {
  type: 'custom' as const,
  apiKey: 'your-api-key',
  baseUrl: 'https://your-custom-api.com/v1',
  customHeaders: {
    'X-Custom-Header': 'value',
  },
};
```

## Advanced Usage

### Direct Provider Access

```typescript
import { ProviderFactory } from '$lib/server/providers';

const provider = ProviderFactory.createProvider({
  type: 'openai',
  apiKey: 'sk-...',
});

const models = await provider.getModels();
const response = await provider.createChatCompletion({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### Custom Temperature and Parameters

```typescript
const response = await providerManager.createChatCompletion(
  config,
  {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Be creative!' }],
    temperature: 0.9,
    max_tokens: 2000,
    top_p: 0.95,
    frequency_penalty: 0.5,
    presence_penalty: 0.5,
  }
);
```

### Error Handling

```typescript
import type { ProviderError } from '$lib/server/providers';

try {
  const response = await providerManager.createChatCompletion(config, request);
} catch (error) {
  const providerError = error as ProviderError;
  console.error(\`Provider: \${providerError.provider}\`);
  console.error(\`Status: \${providerError.statusCode}\`);
  console.error(\`Message: \${providerError.message}\`);
}
```

### Managing Cache

```typescript
// Clear all caches
providerManager.clearCache();

// Clear cache for specific provider
providerManager.clearProviderCache(config);

// Force refresh models (bypass cache)
const models = await providerManager.getModels(config, false);
```

## Types

### ChatCompletionRequest

```typescript
interface ChatCompletionRequest {
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
```

### Message

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### ChatCompletionResponse

```typescript
interface ChatCompletionResponse {
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
```

## Database Schema

The provider system uses the following tables:

- `provider_configs`: Store provider API configurations
- `messages`: Store chat messages with provider and token usage info
- `model_preferences`: Track user's favorite models and usage

See `main-init.sql` for the complete schema.

## Best Practices

1. **Secure API Keys**: Never commit API keys to version control. Use environment variables or secure storage.

2. **Use Database Storage**: Store provider configurations in the database for multi-user applications.

3. **Handle Errors**: Always wrap API calls in try-catch blocks and handle errors appropriately.

4. **Cache Management**: Use caching for model lists but be aware of TTL (1 hour default).

5. **Streaming for Long Responses**: Use streaming for better user experience with long-form content.

6. **Track Token Usage**: Save token usage to the database for cost tracking and analytics.

7. **Set Defaults**: Configure a default provider for easier usage across your application.

## License

MIT
