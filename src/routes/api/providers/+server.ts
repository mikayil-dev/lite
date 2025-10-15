import { json } from '@sveltejs/kit';
import { ProviderDB } from '$lib/server/providers';
import type { RequestHandler } from './$types';

/**
 * GET /api/providers
 * Get all provider configurations
 */
export const GET: RequestHandler = async () => {
  try {
    const providers = await ProviderDB.getAll();

    // Don't send full API keys to the client
    const sanitizedProviders = providers.map((p) => ({
      ...p,
      apiKey: p.apiKey.slice(0, 8) + '...',
      isDefault: p.isDefault,
    }));

    return json({ providers: sanitizedProviders });
  } catch (error) {
    console.error('Get providers error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
};

/**
 * POST /api/providers
 * Create a new provider configuration
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    console.log('Received provider creation request:', { ...body, apiKey: '[REDACTED]' });

    const { name, type, apiKey, baseUrl, organization, customHeaders, setAsDefault } = body;

    if (!name || !type || !apiKey) {
      console.error('Missing required fields:', { name: !!name, type: !!type, apiKey: !!apiKey });
      return json(
        { error: 'Name, type, and apiKey are required' },
        { status: 400 }
      );
    }

    console.log('Creating provider with config:', {
      name,
      type,
      baseUrl,
      organization,
      hasCustomHeaders: !!customHeaders,
      setAsDefault
    });

    const id = await ProviderDB.create(
      {
        name,
        type,
        apiKey,
        baseUrl,
        organization,
        customHeaders,
      },
      setAsDefault
    );

    console.log('Provider created successfully with ID:', id);
    return json({ id, message: 'Provider created successfully' });
  } catch (error) {
    console.error('Create provider error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
};
