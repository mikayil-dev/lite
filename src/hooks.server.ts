import { db } from 'lib/server/db/db';

console.log(await db.getAll("SELECT 'DB initialized' AS message"));
