import { Chat } from 'lib/services/Chat.svelte';

export async function load(): Promise<void> {
  if (Chat.allChatsArray.length) return new Promise(() => true);
}
