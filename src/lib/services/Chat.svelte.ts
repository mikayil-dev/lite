import { db } from '../../hooks.client';
import type { ChatRow } from './types/Chat.types';

export class Chat {
  private static initialized = false;
  private static allChats: Record<string, ChatRow> = $state({});

  private static async initChats(): Promise<void> {
    if (this.initialized) return;

    const chats = await db.select<ChatRow[]>('SELECT * FROM chats');

    for (const chat of chats) {
      this.allChats[chat.id] = chat;
    }

    this.initialized = true;
  }

  static get allChatsArray(): Readonly<ChatRow>[] {
    return Object.values(Chat.allChats);
  }

  static async getChats(forceUpdate = false): Promise<Record<string, ChatRow>> {
    if (!this.initialized || forceUpdate) await this.initChats();

    return this.allChats;
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
