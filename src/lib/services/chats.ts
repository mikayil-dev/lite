import { query, execute } from '$lib/db/client';

export interface ChatRow {
  id: string;
  title: string;
  created_at: string;
  last_message_at: string;
}

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  last_message_at: string;
}

function rowToChat(row: ChatRow): Chat {
  return {
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    last_message_at: row.last_message_at,
  };
}

export async function getAllChats(
  sortBy: 'created_at' | 'last_message' = 'last_message',
): Promise<Chat[]> {
  const orderBy = sortBy === 'created_at' ? 'created_at' : 'last_message_at';
  const rows = await query<ChatRow>(
    `SELECT * FROM chats ORDER BY ${orderBy} DESC`,
  );
  return rows.map(rowToChat);
}

export async function getChatById(id: string): Promise<Chat | null> {
  const rows = await query<ChatRow>('SELECT * FROM chats WHERE id = ?', [id]);
  return rows[0] ? rowToChat(rows[0]) : null;
}

export async function createChat(
  id: string,
  title: string,
  createdAt: string,
): Promise<void> {
  await execute(
    'INSERT INTO chats (id, title, created_at, last_message_at) VALUES (?, ?, ?, ?)',
    [id, title, createdAt, createdAt],
  );
}

export async function updateChatTitle(id: string, title: string): Promise<void> {
  await execute('UPDATE chats SET title = ? WHERE id = ?', [title, id]);
}

export async function updateChatLastMessage(id: string): Promise<void> {
  await execute(
    'UPDATE chats SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id],
  );
}

export async function deleteChat(id: string): Promise<void> {
  await execute('DELETE FROM messages WHERE chat_id = ?', [id]);
  await execute('DELETE FROM chats WHERE id = ?', [id]);
}
