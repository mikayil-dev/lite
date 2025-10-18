import type { MessageRole } from '$lib/providers/types';
import { query, execute } from '$lib/db/client';

export interface MessageRow {
  id: number;
  chat_id: string;
  role: MessageRole;
  content: string;
  model: string | null;
  provider_id: number | null;
  tokens_prompt: number | null;
  tokens_completion: number | null;
  created_at: string;
}

export interface Message {
  id: number;
  chat_id: string;
  role: MessageRole;
  content: string;
  model: string | null;
  provider_id: number | null;
  tokens_prompt: number | null;
  tokens_completion: number | null;
  created_at: string;
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    chat_id: row.chat_id,
    role: row.role,
    content: row.content,
    model: row.model,
    provider_id: row.provider_id,
    tokens_prompt: row.tokens_prompt,
    tokens_completion: row.tokens_completion,
    created_at: row.created_at,
  };
}

export async function getMessagesByChatId(chatId: string): Promise<Message[]> {
  const rows = await query<MessageRow>(
    'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
    [chatId],
  );
  return rows.map(rowToMessage);
}

export async function createMessage(
  chatId: string,
  role: MessageRole,
  content: string,
  model?: string,
  providerId?: number,
): Promise<number> {
  console.log('createMessage called with:', { chatId, role, content: content.substring(0, 50), model, providerId });
  
  // Verify chat exists
  const chats = await query('SELECT id FROM chats WHERE id = ?', [chatId]);
  console.log('Chat exists:', chats.length > 0, chats);
  
  // Verify provider exists if provided
  if (providerId) {
    const providers = await query('SELECT id FROM provider_configs WHERE id = ?', [providerId]);
    console.log('Provider exists:', providers.length > 0, providers);
  }
  
  const result = await execute(
    'INSERT INTO messages (chat_id, role, content, model, provider_id) VALUES (?, ?, ?, ?, ?)',
    [chatId, role, content, model ?? null, providerId ?? null],
  );
  return result.lastInsertId;
}

export async function updateMessage(id: number, content: string): Promise<void> {
  await execute('UPDATE messages SET content = ? WHERE id = ?', [content, id]);
}

export async function updateMessageTokens(
  id: number,
  promptTokens?: number,
  completionTokens?: number,
): Promise<void> {
  await execute(
    'UPDATE messages SET tokens_prompt = ?, tokens_completion = ? WHERE id = ?',
    [promptTokens ?? null, completionTokens ?? null, id],
  );
}

export async function deleteMessage(id: number): Promise<void> {
  await execute('DELETE FROM messages WHERE id = ?', [id]);
}
