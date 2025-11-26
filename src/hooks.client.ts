import Database from '@tauri-apps/plugin-sql';

export const db = await Database.load('sqlite:main.db').then((db) => {
  console.info('Database connected', db);
});
