import Database from '@tauri-apps/plugin-sql';

export async function getDb(): Promise<Database> {
  return Database.load('sqlite:main.db');
}
