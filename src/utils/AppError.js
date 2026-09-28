/**
 * Represents an expected operational application error.
 *
 * Examples include:
 * - invalid user input;
 * - authentication failures;
 * - resources that do not exist;
 * - authorization failures.
 *
 * Operational errors can safely be converted into an HTTP response
 * without exposing internal implementation details.
 */
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);

        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
