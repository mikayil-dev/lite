import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ProviderDB } from '$lib/providers/index';

/**
 * POST /api/providers/[id]/default
 * Set a provider as default
 */
export const POST: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return json({ error: 'Provider ID is required' }, { status: 400 });
    }

    await ProviderDB.setDefault(parseInt(id));

    return json({ message: 'Default provider set successfully' });
  } catch (error) {
    console.error('Set default provider error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
};
