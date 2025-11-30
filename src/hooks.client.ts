import { getDb } from 'lib/services/db';

/** Client-side database instance */
export const db = await getDb();
