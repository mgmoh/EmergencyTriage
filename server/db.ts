import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

// Create a connection pool with optimized settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 10000, // Increased timeout for connections
  statement_timeout: 30000, // Maximum time for queries to execute
  query_timeout: 30000, // Maximum time for queries to execute
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit the process, just log the error
  console.error(err.stack);
});

// Export the database connection
export const db = drizzle(pool, { schema });
export { pool };