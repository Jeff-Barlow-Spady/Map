import sqlite3 from 'sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Determine database file path from environment or default
const dbFile = process.env.DATABASE_URL?.replace(/^sqlite:\/\//, '') || 'tree-explorer.db';
const dbPath = path.join(process.cwd(), dbFile);

// Initialize SQLite database
const db = new sqlite3.Database(dbPath, (err: Error | null) => {
  if (err) console.error('Failed to connect to database', err);
});

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      treeId TEXT,
      sender TEXT,
      message TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );
});

export function saveMessage(
  treeId: string,
  sender: string,
  message: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO stories (treeId, sender, message) VALUES (?, ?, ?)',
      [treeId, sender, message],
      function (this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          console.error('Failed to save message', err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

export function getMessages(
  treeId: string
): Promise<
  Array<{ treeId: string; sender: string; message: string; createdAt: string }>
> {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT treeId, sender, message, createdAt FROM stories WHERE treeId = ? ORDER BY createdAt DESC',
      [treeId],
      (err: Error | null, rows: any[]) => {
        if (err) {
          console.error('Failed to get messages', err);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}
