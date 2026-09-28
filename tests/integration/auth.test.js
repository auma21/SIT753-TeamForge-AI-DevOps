
/**
 * TeamForge AI - Authentication Integration Tests
 *
 * Exercises the complete authentication flow against the
 * dedicated PostgreSQL test database.
 *
 * Coverage includes:
 * - registration;
 * - UUID generation;
 * - bcrypt password storage;
 * - duplicate registration;
 * - successful login;
 * - failed login;
 * - JWT-protected /me endpoint;
 * - unauthenticated access rejection.
 */

const request = require('supertest');

const app = require('../../src/app');

const pool = require('../../src/config/database');

const {
    clearDatabase,
    closeDatabase,
} = require('../helpers/database');

describe('Authentication API', () => {
    /*
     * Use a deterministic test account.
     *
     * The dedicated test database is cleared before this suite
     * executes so previous runs cannot affect the results.
     */
    const testUser = {
        name: 'TeamForge Test User',
        email: 'integration@teamforge.ai',
        password: 'TeamForge123',
    };

    let accessToken;

    beforeAll(async () => {
        await clearDatabase();
    });

    afterAll(async () => {
        /*
         * Remove integration-test data after execution.
         */
        await clearDatabase();

        /*
         * Close PostgreSQL connections so Jest can terminate
         * without reporting open database handles.
         */
        await closeDatabase();
    });

    test(
        'POST /api/auth/register creates a user with a UUID',
        async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            expect(response.statusCode).toBe(201);

            expect(response.body.status)
                .toBe('success');

            expect(response.body.message)
                .toBe(
                    'User registered successfully.'
                );

            expect(response.body.data.user)
                .toMatchObject({
                    name: testUser.name,
                    email: testUser.email,
                    role: 'member',
                });

            /*
             * PostgreSQL should generate a valid UUID rather
             * than a sequential integer identifier.
             */
            expect(response.body.data.user.id)
                .toEqual(expect.any(String));

            expect(response.body.data.user.id)
                .toMatch(
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
                );

            /*
             * Authentication credentials must never be included
             * in API responses.
             */
            expect(
                response.body.data.user.password
            ).toBeUndefined();

            expect(
                response.body.data.user.password_hash
            ).toBeUndefined();
        }
    );

    test(
        'stores a bcrypt hash instead of the plain-text password',
        async () => {
            const result = await pool.query(
                `
                SELECT
                    password_hash
                FROM users
                WHERE email = $1
                `,
                [testUser.email]
            );

            expect(result.rows).toHaveLength(1);

            const storedHash =
                result.rows[0].password_hash;

            /*
             * The original password must never be stored.
             */
            expect(storedHash)
                .not.toBe(testUser.password);

            /*
             * bcrypt hashes normally begin with $2a$, $2b$
             * or $2y$ depending on the implementation.
             */
            expect(storedHash)
                .toMatch(/^\$2[aby]\$/);
        }
    );

    test(
        'rejects duplicate email registration',
        async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            expect(response.statusCode).toBe(409);

            expect(response.body.status)
                .toBe('error');

            expect(response.body.message)
                .toBe(
                    'An account already exists for this email address.'
                );
        }
    );

    test(
        'POST /api/auth/login authenticates valid credentials',
        async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });

            expect(response.statusCode).toBe(200);

            expect(response.body.status)
                .toBe('success');

            expect(response.body.message)
                .toBe(
                    'Authentication successful.'
                );

            expect(response.body.data.token)
                .toEqual(expect.any(String));

            expect(response.body.data.user.email)
                .toBe(testUser.email);

            /*
             * Save the JWT for protected-route tests below.
             */
            accessToken =
                response.body.data.token;
        }
    );

    test(
        'rejects login with an incorrect password',
        async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'IncorrectPassword123',
                });

            expect(response.statusCode).toBe(401);

            expect(response.body.status)
                .toBe('error');

            expect(response.body.message)
                .toBe(
                    'Invalid email or password.'
                );
        }
    );

    test(
        'rejects login for an unknown account',
        async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email:
                        'unknown@teamforge.ai',
                    password:
                        'TeamForge123',
                });

            expect(response.statusCode).toBe(401);

            /*
             * Unknown email and incorrect password deliberately
             * use the same response to reduce account enumeration.
             */
            expect(response.body.message)
                .toBe(
                    'Invalid email or password.'
                );
        }
    );

    test(
        'GET /api/auth/me returns the authenticated user',
        async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set(
                    'Authorization',
                    `Bearer ${accessToken}`
                );

            expect(response.statusCode).toBe(200);

            expect(response.body.status)
                .toBe('success');

            expect(response.body.data.user)
                .toMatchObject({
                    name: testUser.name,
                    email: testUser.email,
                    role: 'member',
                });

            expect(response.body.data.user.id)
                .toEqual(expect.any(String));
        }
    );

    test(
        'GET /api/auth/me rejects requests without authentication',
        async () => {
            const response = await request(app)
                .get('/api/auth/me');

            expect(response.statusCode).toBe(401);

            expect(response.body.status)
                .toBe('error');

            expect(response.body.message)
                .toBe(
                    'Authentication is required to access this resource.'
                );
        }
    );

    test(
        'GET /api/auth/me rejects an invalid JWT',
        async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set(
                    'Authorization',
                    'Bearer invalid-teamforge-token'
                );

            expect(response.statusCode).toBe(401);

            expect(response.body.status)
                .toBe('error');

            expect(response.body.message)
                .toBe(
                    'The supplied authentication token is invalid or expired.'
                );
        }
    );
});