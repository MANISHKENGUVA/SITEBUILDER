const express = require("express");
const cors = require("cors");
const routes = require("./routes");

function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  // Mount API routes
  app.use("/api", routes);

  // Fallback 404
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      code: "ROUTE_NOT_FOUND",
      message: `Cannot ${req.method} ${req.originalUrl}`,
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error("[error]", err);
    res.status(err.statusCode || 500).json({
      success: false,
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected server error occurred",
    });
  });

  return app;
}

module.exports = { createApp };

