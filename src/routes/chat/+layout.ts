import { chats } from 'lib/stores/state.svelte';
import { db } from '../../hooks.client';
import type { Chat } from 'lib/services/types/chatService.types';

export async function load(): Promise<void> {
  if (Object.keys(chats).length) return;

  const rows: Chat[] = await db.select('SELECT * from chats');
  if (!rows || !Array.isArray(rows)) {
    throw new Error('Failed to fetch chats from the database');
  }

  for (const row of rows) {
    if (!row?.id) return;
    chats[row.id] = row;
  }
}
