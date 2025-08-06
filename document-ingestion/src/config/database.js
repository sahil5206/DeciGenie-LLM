const { Pool } = require('pg');

let pool;

const connectDatabase = async () => {
  try {
    console.log('Attempting to connect to PostgreSQL database...');
    
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@database:5432/decigenie';
    
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    console.log('Connected to PostgreSQL database successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

const query = async (sql, params = []) => {
  try {
    const result = await pool.query(sql, params);
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

const run = async (sql, params = []) => {
  try {
    const result = await pool.query(sql, params);
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

const closePool = async () => {
  try {
    if (pool) {
      await pool.end();
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database:', error);
  }
};

module.exports = {
  connectDatabase,
  query,
  run,
  closePool
}; 