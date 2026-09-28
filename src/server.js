/**
 * TeamForge AI HTTP server entry point.
 *
 * Environment variables are loaded before importing the application
 * so configuration is available to all downstream modules.
 */



const app = require("./app");
const pool = require("./config/database");

const PORT = Number(process.env.PORT || 3000);

let server;

/**
 * Start the application only after confirming that PostgreSQL
 * is reachable. This prevents an apparently healthy web process
 * from running without its required database.
 */
async function startServer() {
  try {
    await pool.query("SELECT 1");

    console.log("PostgreSQL connection verified.");

    server = app.listen(PORT, () => {
      console.log(
        `TeamForge AI running on port ${PORT} ` +
          `(${process.env.NODE_ENV || "development"})`,
      );
    });
  } catch (error) {
    console.error("Unable to start TeamForge AI:", error);
    process.exit(1);
  }
}

/**
 * Perform graceful shutdown so active connections can close
 * cleanly when Docker/Jenkins stops the application.
 */
async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully.`);

  if (server) {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  } else {
    await pool.end();
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();
