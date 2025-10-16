import { json } from '@sveltejs/kit';
import { ProviderDB } from '$lib/server/providers';
import type { RequestHandler } from './$types';

/**
 * PATCH /api/providers/[id]
 * Update a provider configuration
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;
    const updates = await request.json();

    if (!id) {
      return json({ error: 'Provider ID is required' }, { status: 400 });
    }

    await ProviderDB.update(parseInt(id), updates);

    return json({ message: 'Provider updated successfully' });
  } catch (error) {
    console.error('Update provider error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
};

/**
 * DELETE /api/providers/[id]
 * Delete a provider configuration
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return json({ error: 'Provider ID is required' }, { status: 400 });
    }

    await ProviderDB.delete(parseInt(id));

    return json({ message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('Delete provider error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
};
