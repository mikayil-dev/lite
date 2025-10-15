import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import type { RequestHandler } from './$types';
import { triggerChatRefresh } from '$lib/stores/chatStore';

/**
 * GET /api/chats/[id]
 * Get a single chat
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const chat = (await db.get('SELECT * FROM chats WHERE id = ?', [
      params.id,
    ])) as
      | {
          id: string;
          title: string;
          created_at: string;
        }
      | undefined;

    if (!chat) {
      return json({ error: 'Chat not found' }, { status: 404 });
    }

    return json(chat);
  } catch (error) {
    console.error('Get chat error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
};

/**
 * PATCH /api/chats/[id]
 * Update a chat (e.g., title)
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const { title } = await request.json();

    if (!title) {
      return json({ error: 'Title is required' }, { status: 400 });
    }

    await db.get('UPDATE chats SET title = ? WHERE id = ?', [title, params.id]);

    return json({ message: 'Chat updated successfully' });
  } catch (error) {
    console.error('Update chat error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/chats/[id]
 * Delete a chat (and all its messages via CASCADE)
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    await db.get('DELETE FROM chats WHERE id = ?', [params.id]);

    return json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete chat error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
};
