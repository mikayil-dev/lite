import { Chat } from 'lib/services/Chat.svelte';
import { getDb } from 'lib/services/db';

/** Client-side database instance */
export const db = await getDb();
await Chat.getChats();
