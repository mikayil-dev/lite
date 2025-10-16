import { json } from '@sveltejs/kit';
import { providerManager, ProviderDB } from '$lib/providers/index';
import type { RequestHandler } from './$types';

/**
 * POST /api/chat
 * Send a message and get streaming response
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { message, chatId, providerId, model } = await request.json();

    if (!message || !chatId) {
      return json(
        { error: 'Message and chatId are required' },
        { status: 400 },
      );
    }

    // Get provider config
    let providerConfig;
    if (providerId) {
      providerConfig = await ProviderDB.getById(providerId);
    } else {
      providerConfig = await ProviderDB.getDefault();
    }

    if (!providerConfig) {
      return json(
        {
          error:
            'No provider configuration found. Please configure a provider in settings.',
        },
        { status: 400 },
      );
    }

    // Get message history
    const history = await ProviderDB.getMessages(chatId);

    // Save user message
    await ProviderDB.saveMessage({
      chatId,
      role: 'user',
      content: message,
    });

    // Create streaming response
    const stream = providerManager.createChatCompletionStream(providerConfig, {
      model: model || 'gpt-4o-mini',
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
    });

    let fullResponse = '';
    let finishReason: 'stop' | 'length' | 'content_filter' | null = null;

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            fullResponse += chunk.delta;
            if (chunk.finishReason) {
              finishReason = chunk.finishReason;
            }

            // Send chunk to client
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ delta: chunk.delta, finishReason: chunk.finishReason })}\n\n`,
              ),
            );
          }

          // Save assistant response to database
          await ProviderDB.saveMessage({
            chatId,
            role: 'assistant',
            content: fullResponse,
            model: model || 'gpt-4o-mini',
            providerId: providerConfig!.id,
          });

          // Update model preference
          await ProviderDB.updateModelPreference(
            providerConfig!.id,
            model || 'gpt-4o-mini',
            model || 'gpt-4o-mini',
          );

          // Send done signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
};
