const fs = require('fs');
const path = require('path');

let dbPath;
let data = {
  queries: [],
  documents: []
};

const connectDatabase = async () => {
  try {
    console.log('Attempting to connect to JSON database...');
    
    // Create database file in a persistent volume
    dbPath = process.env.DATABASE_PATH || '/app/data/decigenie.json';
    
    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Load existing data if file exists
    if (fs.existsSync(dbPath)) {
      try {
        const fileContent = fs.readFileSync(dbPath, 'utf8');
        data = JSON.parse(fileContent);
        console.log('Loaded existing data from JSON database');
      } catch (error) {
        console.log('Could not load existing data, starting fresh');
        data = { queries: [], documents: [] };
      }
    } else {
      console.log('Creating new JSON database file');
      // Save initial data
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    }
    
    console.log('Connected to JSON database successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      // Simple query implementation for JSON database
      if (sql.toLowerCase().includes('select')) {
        if (sql.toLowerCase().includes('queries')) {
          resolve({ rows: data.queries });
        } else if (sql.toLowerCase().includes('documents')) {
          resolve({ rows: data.documents });
        } else {
          resolve({ rows: [] });
        }
      } else {
        resolve({ rows: [] });
      }
    } catch (error) {
      reject(error);
    }
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      // Simple run implementation for JSON database
      if (sql.toLowerCase().includes('insert into queries')) {
        const newQuery = {
          id: params[0] || Date.now().toString(),
          query: params[1] || '',
          context: params[2] || '',
          response: params[3] || '',
          created_at: params[4] || new Date().toISOString(),
          updated_at: params[5] || new Date().toISOString()
        };
        data.queries.push(newQuery);
        saveData();
        resolve({ lastID: newQuery.id });
      } else if (sql.toLowerCase().includes('insert into documents')) {
        const newDocument = {
          id: params[0] || Date.now().toString(),
          filename: params[1] || '',
          content: params[2] || '',
          created_at: params[3] || new Date().toISOString()
        };
        data.documents.push(newDocument);
        saveData();
        resolve({ lastID: newDocument.id });
      } else if (sql.toLowerCase().includes('update queries')) {
        const id = params[0];
        const queryIndex = data.queries.findIndex(q => q.id === id);
        if (queryIndex !== -1) {
          data.queries[queryIndex] = {
            ...data.queries[queryIndex],
            response: params[1] || data.queries[queryIndex].response,
            updated_at: new Date().toISOString()
          };
          saveData();
        }
        resolve({ changes: 1 });
      } else {
        resolve({ changes: 0 });
      }
    } catch (error) {
      reject(error);
    }
  });
};

const saveData = () => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

const closeDb = () => {
  try {
    saveData();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }
};

module.exports = {
  connectDatabase,
  query,
  run,
  closeDb
}; 