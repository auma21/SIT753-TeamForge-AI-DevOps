/**
 * TeamForge AI Express application.
 *
 * Configures application-level middleware, API routes,
 * static content and centralised error handling.
 *
 * The HTTP listener is deliberately kept in server.js so this
 * application can be imported independently during automated tests.
 */

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");

const projectRoutes = require("./routes/project.routes");
const projectTaskRoutes = require("./routes/projectTask.routes");

const taskRoutes = require("./routes/task.routes");

const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

/*
 * Security middleware.
 *
 * Helmet configures a collection of HTTP response headers that
 * reduce exposure to common browser-based security risks.
 */
app.use(helmet());

/*
 * Compress eligible HTTP responses to reduce transferred data.
 */
app.use(compression());

/*
 * Parse JSON request bodies.
 *
 * The size restriction helps prevent excessively large request
 * bodies from consuming unnecessary server resources.
 */
app.use(
  express.json({
    limit: "1mb",
  }),
);

/*
 * Parse URL-encoded form submissions.
 */
app.use(
  express.urlencoded({
    extended: false,
    limit: "1mb",
  }),
);

/*
 * Cross-Origin Resource Sharing configuration.
 *
 * Browser clients are restricted to the configured frontend
 * origin instead of allowing unrestricted cross-origin access.
 */
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);

/*
 * HTTP request logging.
 *
 * Development uses concise logs while production uses the
 * more comprehensive combined log format.
 */
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/*
 * General API rate limiter.
 *
 * Restricts excessive requests from a single client within
 * a defined time window.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

/*
 * Serve the TeamForge AI frontend from the public directory.
 */
app.use(express.static("public"));

/*
 * Public operational health endpoint.
 */
app.use("/health", healthRoutes);

/*
 * Authentication API.
 */
app.use("/api/auth", authRoutes);

/*
 * Authenticated project-management API.
 */
app.use("/api/projects", projectRoutes);
/*
 * Nested Project -> Task API.
 *
 * projectTaskRoutes defines:
 * /:projectId/tasks
 *
 * Therefore the complete endpoint becomes:
 * /api/projects/:projectId/tasks
 */
app.use("/api/projects", projectTaskRoutes);

/*
 * Individual Task CRUD API.
 */
app.use("/api/tasks", taskRoutes);

/*
 * Requests that reach this point do not match a registered route.
 */
app.use(notFound);

/*
 * Central error handling must remain the final middleware.
 */
app.use(errorHandler);

module.exports = app;
