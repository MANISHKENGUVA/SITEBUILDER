const { Pool } = require("@neondatabase/serverless");
const { config } = require("../config/env");

let pool = null;

function getPool() {
  if (!pool) {
    if (!config.databaseUrl) {
      throw new Error("DATABASE_URL is not set in environment");
    }
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on("error", (error) => {
      console.error("[db] pool idle client error:", error.message);
    });
  }
  return pool;
}

function query(text, params = []) {
  return getPool().query(text, params);
}

function run(executor, text, params = []) {
  return executor.query(text, params);
}

async function withTransaction(work) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Keep original error
    }
    throw error;
  } finally {
    client.release();
  }
}

async function ping() {
  try {
    const result = await query("SELECT 1 AS ok");
    return result.rows[0]?.ok === 1;
  } catch (e) {
    console.error("[db] ping failed:", e.message);
    return false;
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, query, run, withTransaction, ping, closePool };

