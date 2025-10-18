import { json } from '@sveltejs/kit';
import { nanoid } from 'nanoid';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/db';

/**
 * GET /api/chats
 * Get all chats with optional sorting
 * Query params: sortBy=created_at|last_message (default: last_message)
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const sortBy = url.searchParams.get('sortBy') ?? 'last_message';

    let query = `
      SELECT
        c.id,
        c.title,
        c.created_at,
        COALESCE(MAX(m.created_at), c.created_at) as last_message_at
      FROM chats c
      LEFT JOIN messages m ON c.id = m.chat_id
      GROUP BY c.id
    `;

    if (sortBy === 'created_at') {
      query += ' ORDER BY c.created_at DESC';
    } else {
      query += ' ORDER BY last_message_at DESC';
    }

    const chats = (await db.getAll(query)) as Array<{
      id: string;
      title: string;
      created_at: string;
      last_message_at: string;
    }>;

    return json({ chats });
  } catch (error) {
    console.error('Get chats error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
};

/**
 * POST /api/chats
 * Create a new chat
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { title } = (await request.json()) as { title?: string };

    const id = nanoid();
    const now = new Date().toISOString();

    await db.get('INSERT INTO chats (id, title, created_at) VALUES (?, ?, ?)', [
      id,
      title ?? 'New Chat',
      now,
    ]);

    return json({ id, title: title ?? 'New Chat', created_at: now });
  } catch (error) {
    console.error('Create chat error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
};
