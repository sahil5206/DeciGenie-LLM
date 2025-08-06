const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

const connectDatabase = async () => {
  try {
    console.log('Attempting to connect to SQLite database...');
    
    // Create database file in a persistent volume
    const dbPath = process.env.DATABASE_PATH || '/app/data/decigenie.db';
    
    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    const fs = require('fs');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        throw err;
      }
      console.log('Connected to SQLite database successfully');
    });

    // Initialize database tables
    await initializeTables();
    
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

const initializeTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create queries table
      db.run(`
        CREATE TABLE IF NOT EXISTS queries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          query_text TEXT NOT NULL,
          response_text TEXT,
          user_id TEXT,
          document_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating queries table:', err);
          reject(err);
        } else {
          console.log('Queries table ready');
        }
      });

      // Create documents table
      db.run(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          file_path TEXT,
          file_size INTEGER,
          upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          processed BOOLEAN DEFAULT 0,
          content_text TEXT
        )
      `, (err) => {
        if (err) {
          console.error('Error creating documents table:', err);
          reject(err);
        } else {
          console.log('Documents table ready');
        }
      });

      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
        } else {
          console.log('Users table ready');
          resolve();
        }
      });
    });
  });
};

const getDb = () => {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return db;
};

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const closeDb = async () => {
  if (db) {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  }
};

module.exports = {
  connectDatabase,
  getDb,
  query,
  run,
  closeDb
}; 