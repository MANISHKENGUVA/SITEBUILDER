const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const port = Number(process.env.PORT) === 3000 ? 3100 : Number(process.env.PORT || 3100);

const config = {
  port,
  databaseUrl: process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV || "development",
};

module.exports = { config };

