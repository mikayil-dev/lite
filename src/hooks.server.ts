import { db } from 'lib/server/db/db';

// Initialize the database and log a message
console.log(await db.get("SELECT 'DB initialized' AS message"));
