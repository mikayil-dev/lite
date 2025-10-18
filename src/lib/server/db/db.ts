import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { cwd } from 'process';
import sqlite3 from 'sqlite3';

export class Database {
  private db: sqlite3.Database;

  constructor(dbName: string) {
    const initSQL = this.loadInitSQL(dbName);
    const sqlite3V = sqlite3.verbose();
    const dbPath = this.getDbPath(dbName);
    
    // Ensure the directory exists
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    
    this.db = new sqlite3V.Database(dbPath);
    this.db.serialize(() => {
      this.db.run(initSQL);
    });
    console.log({ message: 'DB initialized', path: dbPath });
  }

  private loadInitSQL(dbName: string): string {
    const sqlFileName = `${dbName}-init.sql`;
    
    // Try production location (bundled resources)
    if (process.resourcesPath) {
      try {
        const prodPath = join(process.resourcesPath as string, sqlFileName);
        return readFileSync(prodPath, 'utf8');
      } catch (error) {
        console.warn('Could not load SQL from resources:', error instanceof Error ? error.message : String(error));
      }
    }
    
    // Fallback to dev location
    try {
      const devPath = join(cwd(), 'src', 'lib', 'server', 'db', sqlFileName);
      return readFileSync(devPath, 'utf8');
    } catch (error) {
      console.error('Could not load SQL from dev location:', error);
      throw new Error(`Failed to load ${sqlFileName}`);
    }
  }

  private getDbPath(dbName: string): string {
    // In production (Tauri), use app data directory
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      // This will be resolved asynchronously, but we need sync for constructor
      // For now, use a synchronous fallback
      const platform = process.platform;
      const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
      
      let appData = '';
      if (platform === 'darwin') {
        appData = join(home, 'Library', 'Application Support', 'com.lite.app');
      } else if (platform === 'win32') {
        appData = join(process.env.APPDATA ?? '', 'com.lite.app');
      } else {
        appData = join(home, '.local', 'share', 'com.lite.app');
      }
      
      return join(appData, `${dbName}.sqlite`);
    }
    
    // In development, use current directory
    return `./${dbName}.sqlite`;
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
        resolve(rows);
      });
    });
  }
}

export const db = new Database('main');
