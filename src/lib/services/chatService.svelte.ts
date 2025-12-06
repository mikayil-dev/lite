import { db } from '../../hooks.client';
import type { ChatRow } from './types/chatService.types';

export class Chat {
  private static allChats: Record<string, ChatRow> = $state({});

  static get chats(): Readonly<Record<string, ChatRow>> {
    return Chat.allChats;
  }

  static get allChatsArray(): Readonly<ChatRow>[] {
    return Object.values(Chat.allChats);
  }

  static async getById(id: string): Promise<ChatRow | null> {
    const chats = await db.select<ChatRow[]>(
      'SELECT * FROM chats WHERE id = $1',
      [id],
    );
    if (Array.isArray(chats) && chats[0]) return chats[0];
    return null;
  }
}
