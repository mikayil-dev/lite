import { json } from '@sveltejs/kit';
import { ProviderDB } from '$lib/server/providers';
import type { RequestHandler } from './$types';

/**
 * GET /api/preferences
 * Get user preferences
 */
export const GET: RequestHandler = async () => {
  try {
    const preferences = await ProviderDB.getUserPreferences();

    return json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
};

/**
 * PUT /api/preferences
 * Update user preferences
 */
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const { selectedProviderId, selectedModelId } = await request.json();

    await ProviderDB.updateUserPreferences(
      selectedProviderId ?? null,
      selectedModelId ?? null,
    );

    return json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Update preferences error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
};
