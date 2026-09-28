/**
 * Wraps asynchronous Express route handlers.
 *
 * Any rejected Promise is automatically forwarded to the
 * central Express error-handling middleware.
 *
 * @param {Function} handler asynchronous Express route handler
 * @returns {Function} wrapped Express middleware
 */
function asyncHandler(handler) {
    return function wrappedHandler(req, res, next) {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

module.exports = asyncHandler;
