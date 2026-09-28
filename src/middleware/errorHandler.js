/**
 * TeamForge AI - Central Error Handler
 *
 * Converts application errors into consistent HTTP responses.
 *
 * Express identifies error-handling middleware by its
 * four-argument function signature.
 */
function errorHandler(error, req, res, _next) {
  /*
   * Use the status code supplied by an expected application
   * error. Unexpected errors default to HTTP 500.
   */
  const statusCode = error.statusCode || 500;

  /*
   * Unexpected production errors are deliberately sanitised
   * so implementation details are not disclosed to clients.
   */
  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "An unexpected server error occurred."
      : error.message;

  /*
   * Server-side failures are logged for operational diagnosis.
   */
  if (statusCode >= 500) {
    console.error({
      message: error.message,
      stack: error.stack,
      method: req.method,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  const response = {
    status: "error",
    message,
  };

  /*
   * Stack traces are useful during development/testing but
   * should not be exposed to production clients.
   */
  if (process.env.NODE_ENV !== "production") {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
