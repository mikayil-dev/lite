import { db } from 'lib/server/db/db';

console.log(await db.get("SELECT 'DB initialized' AS message"));
