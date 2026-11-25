import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { buildDemoState, DatabaseState } from './seedData';
import { checkPostgresConnection } from './prisma';
import { env } from '../config/env';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'voxsales-db.json');

class DataStore {
  private state: DatabaseState;
  public backendType: 'postgresql' | 'local-json-store' = 'local-json-store';

  constructor() {
    this.state = this.loadFromDisk();
  }

  async init(): Promise<void> {
    const pgReady = await checkPostgresConnection();
    this.backendType = pgReady && env.STORAGE_MODE !== 'local' ? 'postgresql' : 'local-json-store';
  }

  private loadFromDisk(): DatabaseState {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseState;
        if (parsed && Array.isArray(parsed.organizations) && parsed.organizations.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fall back to fresh demo state if file is unreadable/corrupt
    }
    const fresh = buildDemoState();
    this.persist(fresh);
    return fresh;
  }

  private persist(stateToWrite: DatabaseState = this.state): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(stateToWrite, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist local store:', err);
    }
  }

  public get db(): DatabaseState {
    return this.state;
  }

  public save(): void {
    this.persist(this.state);
  }

  public resetDemo(): DatabaseState {
    this.state = buildDemoState();
    this.persist(this.state);
    return this.state;
  }

  public newId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
  }
}

export const store = new DataStore();
