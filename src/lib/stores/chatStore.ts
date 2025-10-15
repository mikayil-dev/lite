import { writable } from 'svelte/store';

/**
 * Store to trigger sidebar refresh when chats are created/updated/deleted
 */
export const chatRefreshTrigger = writable(0);

/**
 * Trigger a refresh of the chat list in the sidebar
 */
export function triggerChatRefresh(): void {
  chatRefreshTrigger.update((n) => n + 1);
}
