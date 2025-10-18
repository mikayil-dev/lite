import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/db';

/**
 * PATCH /api/messages/[id]
 * Update a message
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;
    const { content } = (await request.json()) as { content: string };

    if (!content) {
      return json({ error: 'Content is required' }, { status: 400 });
    }

    await db.get('UPDATE messages SET content = ? WHERE id = ?', [content, id]);

    return json({ message: 'Message updated successfully' });
  } catch (error) {
    console.error('Update message error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
};

/**
 * DELETE /api/messages/[id]
 * Delete a message
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    await db.get('DELETE FROM messages WHERE id = ?', [id]);

    return json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
};
