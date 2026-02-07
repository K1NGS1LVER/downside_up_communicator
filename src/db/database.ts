import initSqlJs from 'sql.js';

// SQLite database service for storing transmission history
class TransmissionDB {
  private db: any = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const SQL = await initSqlJs({
      // Load sql.js wasm from CDN
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });

    // Try to load existing database from localStorage
    const savedDb = localStorage.getItem('upside_down_db');
    if (savedDb) {
      const uint8Array = new Uint8Array(JSON.parse(savedDb));
      this.db = new SQL.Database(uint8Array);
    } else {
      this.db = new SQL.Database();
      this.createTables();
    }

    this.initialized = true;
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS transmissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        encrypted TEXT,
        timestamp TEXT NOT NULL,
        encryption_mode TEXT DEFAULT 'none',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.save();
  }

  save(): void {
    if (!this.db) return;

    const data = this.db.export();
    const arr = Array.from(data);
    localStorage.setItem('upside_down_db', JSON.stringify(arr));
  }

  addTransmission(
    message: string,
    encrypted: string | null,
    timestamp: string,
    encryptionMode: string
  ): void {
    if (!this.db) return;

    this.db.run(
      `INSERT INTO transmissions (message, encrypted, timestamp, encryption_mode) VALUES (?, ?, ?, ?)`,
      [message, encrypted, timestamp, encryptionMode]
    );

    this.save();
  }

  getAllTransmissions(): Array<{
    id: number;
    message: string;
    encrypted: string | null;
    timestamp: string;
    encryption_mode: string;
  }> {
    if (!this.db) return [];

    const result = this.db.exec(
      `SELECT id, message, encrypted, timestamp, encryption_mode FROM transmissions ORDER BY id DESC`
    );

    if (result.length === 0) return [];

    return result[0].values.map((row: (number | string | null)[]) => ({
      id: row[0] as number,
      message: row[1] as string,
      encrypted: row[2] as string | null,
      timestamp: row[3] as string,
      encryption_mode: row[4] as string
    }));
  }

  getRecentTransmissions(limit: number = 10): Array<{
    message: string;
    encrypted: string | null;
    timestamp: string;
  }> {
    if (!this.db) return [];

    const result = this.db.exec(
      `SELECT message, encrypted, timestamp FROM transmissions ORDER BY id DESC LIMIT ?`,
      [limit]
    );

    if (result.length === 0) return [];

    return result[0].values.map((row: (string | null)[]) => ({
      message: row[0] as string,
      encrypted: row[1] as string | null,
      timestamp: row[2] as string
    }));
  }

  clearAll(): void {
    if (!this.db) return;

    this.db.run(`DELETE FROM transmissions`);
    this.save();
  }

  getStats(): { totalCount: number; todayCount: number } {
    if (!this.db) return { totalCount: 0, todayCount: 0 };

    const total = this.db.exec(`SELECT COUNT(*) FROM transmissions`);
    const today = this.db.exec(
      `SELECT COUNT(*) FROM transmissions WHERE DATE(created_at) = DATE('now')`
    );

    return {
      totalCount: total[0]?.values[0]?.[0] as number || 0,
      todayCount: today[0]?.values[0]?.[0] as number || 0
    };
  }
}

// Singleton instance
export const transmissionDB = new TransmissionDB();
