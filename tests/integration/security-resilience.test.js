
/**
 * TeamForge AI - API Security & Resilience Integration Tests
 *
 * CI QUALITY GATE:
 * This suite verifies security-sensitive HTTP behaviours that must
 * remain true before an application artefact can progress through
 * the CI/CD pipeline.
 *
 * This is an application-level regression gate. It complements,
 * but does not replace, dedicated vulnerability scanning.
 */

const request = require('supertest');

const app = require('../../src/app');

const {
    clearDatabase,
    closeDatabase,
} = require('../helpers/database');

describe('CI Gate - API Security and Resilience', () => {
    const testUser = {
        name: 'Security Gate User',
        email: 'security-gate@teamforge.ai',
        password: 'TeamForge123',
    };

    let accessToken;
    let projectId;

    beforeAll(async () => {
        await clearDatabase();

        const registration =
            await request(app)
                .post('/api/auth/register')
                .send(testUser);

        expect(registration.statusCode)
            .toBe(201);

        const login =
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });

        expect(login.statusCode)
            .toBe(200);

        accessToken =
            login.body.data.token;

        const project =
            await request(app)
                .post('/api/projects')
                .set(
                    'Authorization',
                    `Bearer ${accessToken}`
                )
                .send({
                    name: 'Security Gate Project',
                    status: 'active',
                });

        expect(project.statusCode)
            .toBe(201);

        projectId =
            project.body.data.project.id;
    });

    afterAll(async () => {
        await clearDatabase();
        await closeDatabase();
    });

    test(
        'returns security headers configured by Helmet',
        async () => {
            const response =
                await request(app)
                    .get('/health');

            expect(response.statusCode)
                .toBe(200);

            /*
             * Helmet should add common defensive headers.
             */
            expect(
                response.headers[
                    'x-content-type-options'
                ]
            ).toBe('nosniff');

            expect(
                response.headers[
                    'x-frame-options'
                ]
            ).toBeDefined();
        }
    );

    test(
        'rejects malformed JSON rather than processing the request',
        async () => {
            const response =
                await request(app)
                    .post('/api/auth/login')
                    .set(
                        'Content-Type',
                        'application/json'
                    )
                    .send(
                        '{"email":"broken"'
                    );

            expect(response.statusCode)
                .toBe(400);

            expect(response.body.status)
                .toBe('error');
        }
    );

    test(
        'rejects Project creation when required input is missing',
        async () => {
            const response =
                await request(app)
                    .post('/api/projects')
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        status: 'active',
                    });

            expect(response.statusCode)
                .toBe(400);

            expect(response.body.message)
                .toBe(
                    'Request validation failed.'
                );
        }
    );

    test(
        'rejects excessively long Project names',
        async () => {
            const response =
                await request(app)
                    .post('/api/projects')
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        name: 'A'.repeat(151),
                        status: 'active',
                    });

            expect(response.statusCode)
                .toBe(400);

            expect(response.body.status)
                .toBe('error');
        }
    );

    test(
        'rejects excessively long Task titles',
        async () => {
            const response =
                await request(app)
                    .post(
                        `/api/projects/${projectId}/tasks`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        title: 'T'.repeat(201),
                        priority: 'medium',
                        status: 'backlog',
                    });

            expect(response.statusCode)
                .toBe(400);
        }
    );

    test(
        'rejects a Bearer token with an invalid signature',
        async () => {
            const response =
                await request(app)
                    .get('/api/projects')
                    .set(
                        'Authorization',
                        'Bearer invalid.jwt.signature'
                    );

            expect(response.statusCode)
                .toBe(401);

            expect(response.body.message)
                .toBe(
                    'The supplied authentication token is invalid or expired.'
                );
        }
    );

    test(
        'does not expose password hashes in authenticated user responses',
        async () => {
            const response =
                await request(app)
                    .get('/api/auth/me')
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(response.statusCode)
                .toBe(200);

            expect(
                response.body.data.user.password
            ).toBeUndefined();

            expect(
                response.body.data.user.password_hash
            ).toBeUndefined();
        }
    );

    test(
        'handles SQL-injection-like Project input as ordinary data',
        async () => {
            const suspiciousName =
                "Project'); DROP TABLE projects; --";

            const response =
                await request(app)
                    .post('/api/projects')
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        name: suspiciousName,
                        status: 'active',
                    });

            /*
             * Parameterised PostgreSQL queries should treat this
             * string as data rather than executable SQL.
             */
            expect(response.statusCode)
                .toBe(201);

            expect(
                response.body.data.project.name
            ).toBe(suspiciousName);

            /*
             * Confirm the Projects endpoint still operates after
             * the injection-like input.
             */
            const projects =
                await request(app)
                    .get('/api/projects')
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(projects.statusCode)
                .toBe(200);
        }
    );

    test(
        'returns a controlled 404 for unknown routes',
        async () => {
            const response =
                await request(app)
                    .get(
                        '/api/definitely-not-a-teamforge-route'
                    );

            expect(response.statusCode)
                .toBe(404);

            expect(response.body.status)
                .toBe('error');

            expect(response.body.message)
                .toContain(
                    'Route not found'
                );
        }
    );
});