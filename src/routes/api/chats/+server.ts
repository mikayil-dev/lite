import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import type { RequestHandler } from './$types';
import { nanoid } from 'nanoid';

/**
 * GET /api/chats
 * Get all chats
 */
export const GET: RequestHandler = async () => {
  try {
    const chats = (await db.getAll(
      'SELECT * FROM chats ORDER BY created_at DESC'
    )) as Array<{
      id: string;
      title: string;
      created_at: string;
    }>;

    return json({ chats });
  } catch (error) {
    console.error('Get chats error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
};

/**
 * POST /api/chats
 * Create a new chat
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { title } = await request.json();

    const id = nanoid();
    const now = new Date().toISOString();

    await db.get(
      'INSERT INTO chats (id, title, created_at) VALUES (?, ?, ?)',
      [id, title || 'New Chat', now]
    );

    return json({ id, title: title || 'New Chat', created_at: now });
  } catch (error) {
    console.error('Create chat error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
};
