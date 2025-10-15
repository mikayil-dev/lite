import { json } from '@sveltejs/kit';
import { providerManager, ProviderDB } from '$lib/server/providers';
import type { RequestHandler } from './$types';

/**
 * GET /api/models?providerId=123
 * Get available models for a provider
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const providerIdParam = url.searchParams.get('providerId');

    let providerConfig;
    if (providerIdParam) {
      providerConfig = await ProviderDB.getById(parseInt(providerIdParam));
    } else {
      providerConfig = await ProviderDB.getDefault();
    }

    if (!providerConfig) {
      return json(
        { error: 'No provider configuration found' },
        { status: 400 }
      );
    }

    const models = await providerManager.getModels(providerConfig);

    return json({ models });
  } catch (error) {
    console.error('Get models error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
};
