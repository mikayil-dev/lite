import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ProviderDB } from '$lib/providers/index';

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
    const { selectedProviderId, selectedModelId } = (await request.json()) as {
      selectedProviderId?: number | null;
      selectedModelId?: string | null;
    };

    await ProviderDB.updateUserPreferences(
      selectedProviderId ?? (null as number | null),
      selectedModelId ?? (null as string | null),
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
