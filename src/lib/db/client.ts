import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    try {
      dbInstance = await Database.load('sqlite:main.db');
      console.log('Database loaded successfully');
    } catch (error) {
      console.error('Failed to load database:', error);
      throw error;
    }
  }
  return dbInstance;
}

export async function query<T = unknown>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  try {
    const db = await getDb();
    console.log('Executing query:', sql, params);
    const result = await db.select<T>(sql, params);
    console.log('Query result:', result);
    return result;
  } catch (error) {
    console.error('Query failed:', sql, params, error);
    throw error;
  }
}

export async function execute(
  sql: string,
  params?: unknown[],
): Promise<{ lastInsertId: number; rowsAffected: number }> {
  try {
    const db = await getDb();
    console.log('Executing command:', sql, params);
    const result = await db.execute(sql, params);
    console.log('Execute result:', result);
    return result;
  } catch (error) {
    console.error('Execute failed:', sql, params, error);
    throw error;
  }
}
