const { createApp } = require("./app");
const { config } = require("./config/env");
const { initSchema } = require("./db/schema");
const { seedInitialData } = require("./modules/config-builder/configBuilderSeed");
const { ping } = require("./db/pool");

async function start() {
  try {
    console.log(`[boot] Initializing Database Schema...`);
    const dbOk = await ping();
    if (dbOk) {
      console.log(`[boot] Connected to Neon PostgreSQL.`);
      await initSchema();
      console.log(`[boot] Initializing Seed Data...`);
      await seedInitialData();
      console.log(`[boot] Seed data initialized.`);
    } else {
      console.warn(`[boot] Database ping returned false. Server will start in degraded mode.`);
    }

    const app = createApp();
    const server = app.listen(config.port, () => {
      console.log(`[ready] northline-api listening on http://localhost:${config.port}`);
    });

    const shutdown = async () => {
      console.log(`\n[shutdown] Closing server...`);
      server.close(() => {
        console.log(`[shutdown] HTTP server closed.`);
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error(`[fatal] Failed to start server:`, err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { start };

