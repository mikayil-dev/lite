import { readFileSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';

import sqlite3 from 'sqlite3';

export class Database {
  private db;

  constructor(dbName: string) {
    const initSQL = readFileSync(
      join(cwd(), `src/lib/server/db/${dbName}-init.sql`),
      'utf8',
    );
    const sqlite3V = sqlite3.verbose();
    this.db = new sqlite3V.Database(`./${dbName}.sqlite`);
    this.db.serialize(() => {
      this.db.run(initSQL);
    });
  }

  async get(query: string, params: unknown[]): Promise<object> {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err: Error, row: object) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  }

  async getAll(query: string, params: unknown[]): Promise<object> {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err: Error, rows: object[]) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  }
}

export const db = new Database('main');
