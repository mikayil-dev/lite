import { readFileSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';
import sqlite3 from 'sqlite3';

export class Database {
  private db: sqlite3.Database;

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

  /**
   * Runs a SQL query and returns a single row as an object
   * @param query SQL query string
   * @param [params] Query parameters (optional)
   * @returns Promise resolving to a row as an object
   */
  async get(query: string, params?: unknown[]): Promise<object> {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err: Error | null, row: object) => {
        if (err) return reject(err);
        console.log(row);
        resolve(row);
      });
    });
  }

  /**
   * Runs a SQL query and returns all rows as an array objects.
   * @param query SQL query string
   * @param [params] Query parameters (optional)
   * @returns Promise resolving to an array of rows as objects
   */
  async getAll(query: string, params?: unknown[]): Promise<object[]> {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err: Error | null, rows: object[]) => {
        if (err) return reject(err);
        console.log(rows);
        resolve(rows);
      });
    });
  }
}

export const db = new Database('main');
