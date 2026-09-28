/**
 * JWT authentication middleware.
 *
 * Protected API endpoints use this middleware to ensure that
 * requests contain a valid TeamForge AI access token.
 */

const jwt = require('jsonwebtoken');

const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
    const authorization = req.headers.authorization;

    if (
        !authorization ||
        !authorization.startsWith('Bearer ')
    ) {
        throw new AppError(
            'Authentication is required to access this resource.',
            401
        );
    }

    const token = authorization.substring(7);

    let payload;

    try {
        payload = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
                issuer: 'teamforge-ai',
                audience: 'teamforge-ai-web',
            }
        );
    } catch (error) {
        throw new AppError(
            'The supplied authentication token is invalid or expired.',
            401
        );
    }

    /*
     * Verify that the account represented by the token still exists.
     */
    const user = await userRepository.findById(payload.sub);

    if (!user) {
        throw new AppError(
            'The account associated with this token no longer exists.',
            401
        );
    }

    /*
     * Attach the authenticated identity to the request so downstream
     * controllers and authorization checks can use it.
     */
    req.user = user;

    next();
});

module.exports = authenticate;

