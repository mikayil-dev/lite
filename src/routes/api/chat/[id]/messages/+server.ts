import { json } from '@sveltejs/kit';
import { ProviderDB } from '$lib/providers/index';
import type { RequestHandler } from './$types';

/**
 * GET /api/chat/[id]/messages
 * Get all messages for a specific chat
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return json({ error: 'Chat ID is required' }, { status: 400 });
    }

    const messages = await ProviderDB.getMessages(id);

    return json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
};
