/**
 * Authentication HTTP controller.
 *
 * Controllers translate HTTP requests into service calls and
 * convert successful service results into HTTP responses.
 */

const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
    const user = await authService.register({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
    });

    res.status(201).json({
        status: 'success',
        message: 'User registered successfully.',
        data: {
            user,
        },
    });
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
    const result = await authService.login({
        email: req.body.email,
        password: req.body.password,
    });

    res.status(200).json({
        status: 'success',
        message: 'Authentication successful.',
        data: result,
    });
});

/**
 * GET /api/auth/me
 *
 * Returns the identity attached by authentication middleware.
 */
const getCurrentUser = asyncHandler(async (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            user: req.user,
        },
    });
});

module.exports = {
    register,
    login,
    getCurrentUser,
};
