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
   * Runs a SQL query and returns a single row of type T or undefined.
   * @param query SQL query string
   * @param params Query parameters
   * @returns Promise resolving to a row of type T or undefined
   */
  async get<T = unknown>(
    query: string,
    params: unknown[],
  ): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err: Error | null, row: T) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  /**
   * Runs a SQL query and returns all rows as an array of type T.
   * @param query SQL query string
   * @param params Query parameters
   * @returns Promise resolving to an array of rows of type T
   */
  async getAll<T = unknown>(query: string, params: unknown[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err: Error | null, rows: T[]) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
}

export const db = new Database('main');
