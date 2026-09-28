/**
 * Authentication service.
 *
 * Contains TeamForge AI registration and login business logic.
 * Password hashing and JWT creation are kept outside the HTTP
 * controller to improve separation of concerns and testability.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');

/**
 * Generate a signed access token for an authenticated user.
 */
function generateToken(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured.');
    }

    return jwt.sign(
        {
            sub: user.id,
            email: user.email,
            role: user.role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h',
            issuer: 'teamforge-ai',
            audience: 'teamforge-ai-web',
        }
    );
}

/**
 * Register a new TeamForge AI user.
 */
async function register({ name, email, password }) {
    const existingUser = await userRepository.findByEmail(email);

    if (existingUser) {
        throw new AppError(
            'An account already exists for this email address.',
            409
        );
    }

    /*
     * Passwords are never persisted as plain text.
     * A cost factor of 12 provides an appropriate demonstration
     * of computationally expensive password hashing.
     */
    const passwordHash = await bcrypt.hash(password, 12);

    return userRepository.create({
        name,
        email,
        passwordHash,
    });
}

/**
 * Authenticate a user and issue a signed JWT.
 */
async function login({ email, password }) {
    const user = await userRepository.findByEmail(email);

    /*
     * Use the same error response for unknown accounts and invalid
     * passwords to avoid disclosing whether an account exists.
     */
    if (!user) {
        throw new AppError('Invalid email or password.', 401);
    }

    const passwordMatches = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!passwordMatches) {
        throw new AppError('Invalid email or password.', 401);
    }

    const token = generateToken(user);

    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    };
}

module.exports = {
    register,
    login,
};
