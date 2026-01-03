import { db } from '../../hooks.client';
import type { ChatRow } from './types/Chat.types';

const chatState: Record<string, ChatRow> = $state({});

export class Chat {
  private static initialized = false;
  private static allChats = chatState;

  constructor(
    public id: string,
    public title: string,
    public readonly created_at: string,
  ) {}

  private static async initChats(): Promise<void> {
    if (this.initialized) return;

    const chats = await db.select<ChatRow[]>('SELECT * FROM chats');

    for (const chat of chats) {
      this.allChats[chat.id] = chat;
    }

    this.initialized = true;
  }

  static get allChatsArray(): readonly Readonly<ChatRow>[] {
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

  async addMessage(): Promise<unknown> {
    return new Promise(() => true);
  }

  async editMessage(): Promise<unknown> {
    return new Promise(() => true);
  }

  async deleteMessage(): Promise<unknown> {
    return new Promise(() => true);
  }
}
