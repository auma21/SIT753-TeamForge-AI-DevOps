/**
 * TeamForge AI - Project CRUD Integration Tests
 *
 * Exercises Project functionality through the complete application:
 *
 * HTTP -> JWT authentication -> Request validation -> Project controller -> Project service -> Project repository -> PostgreSQL test database
 * 
 */

const request = require('supertest');

const app = require('../../src/app');

const {
    clearDatabase,
    closeDatabase,
} = require('../helpers/database');

describe('Project CRUD API', () => {
    const testUser = {
        name: 'Project Test User',
        email: 'projects@teamforge.ai',
        password: 'TeamForge123',
    };

    let accessToken;
    let userId;
    let projectId;

    /**
     * Establish a clean test database and authenticated user
     * before Project tests execute.
     */
    beforeAll(async () => {
        await clearDatabase();

        const registration =
            await request(app)
                .post('/api/auth/register')
                .send(testUser);

        expect(registration.statusCode)
            .toBe(201);

        userId =
            registration.body.data.user.id;

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
    });

    /**
     * Remove integration-test records and close PostgreSQL.
     */
    afterAll(async () => {
        await clearDatabase();
        await closeDatabase();
    });

    test(
        'GET /api/projects rejects unauthenticated requests',
        async () => {
            const response =
                await request(app)
                    .get('/api/projects');

            expect(response.statusCode)
                .toBe(401);

            expect(response.body.status)
                .toBe('error');

            expect(response.body.message)
                .toBe(
                    'Authentication is required to access this resource.'
                );
        }
    );

    test(
        'POST /api/projects creates a Project with UUID ownership',
        async () => {
            const response =
                await request(app)
                    .post('/api/projects')
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        name:
                            'TeamForge AI DevOps',
                        description:
                            'Integration-test TeamForge project.',
                        status:
                            'active',
                    });

            expect(response.statusCode)
                .toBe(201);

            expect(response.body.status)
                .toBe('success');

            expect(response.body.message)
                .toBe(
                    'Project created successfully.'
                );

            const project =
                response.body.data.project;

            /*
             * PostgreSQL should generate a UUID.
             */
            expect(project.id)
                .toEqual(expect.any(String));

            expect(project.id)
                .toMatch(
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
                );

            /*
             * Project ownership must come from the authenticated
             * JWT identity.
             */
            expect(project.owner_id)
                .toBe(userId);

            expect(project.name)
                .toBe(
                    'TeamForge AI DevOps'
                );

            expect(project.status)
                .toBe('active');

            projectId =
                project.id;
        }
    );

    test(
        'GET /api/projects returns owned Projects',
        async () => {
            const response =
                await request(app)
                    .get('/api/projects')
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(response.statusCode)
                .toBe(200);

            expect(response.body.status)
                .toBe('success');

            expect(response.body.results)
                .toBe(1);

            expect(response.body.data.projects)
                .toHaveLength(1);

            expect(
                response.body.data.projects[0].id
            ).toBe(projectId);
        }
    );

    test(
        'GET /api/projects/:id returns one owned Project',
        async () => {
            const response =
                await request(app)
                    .get(
                        `/api/projects/${projectId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(response.statusCode)
                .toBe(200);

            expect(response.body.data.project.id)
                .toBe(projectId);

            expect(
                response.body.data.project.owner_id
            ).toBe(userId);
        }
    );

    test(
        'PATCH /api/projects/:id partially updates a Project',
        async () => {
            const response =
                await request(app)
                    .patch(
                        `/api/projects/${projectId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        description:
                            'Updated by automated integration testing.',
                        status:
                            'on-hold',
                    });

            expect(response.statusCode)
                .toBe(200);

            expect(response.body.status)
                .toBe('success');

            expect(
                response.body.data.project.name
            ).toBe(
                'TeamForge AI DevOps'
            );

            expect(
                response.body.data.project.description
            ).toBe(
                'Updated by automated integration testing.'
            );

            expect(
                response.body.data.project.status
            ).toBe('on-hold');
        }
    );

    test(
        'rejects malformed Project UUIDs',
        async () => {
            const response =
                await request(app)
                    .get('/api/projects/123')
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(response.statusCode)
                .toBe(400);

            expect(response.body.status)
                .toBe('error');

            expect(response.body.message)
                .toBe(
                    'Request validation failed.'
                );
        }
    );

    test(
        'rejects unsupported Project status values',
        async () => {
            const response =
                await request(app)
                    .patch(
                        `/api/projects/${projectId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        status:
                            'invalid-status',
                    });

            expect(response.statusCode)
                .toBe(400);

            expect(response.body.status)
                .toBe('error');
        }
    );

    test(
        'returns 404 for a valid but nonexistent Project UUID',
        async () => {
            const nonexistentId =
                '11111111-1111-4111-8111-111111111111';

            const response =
                await request(app)
                    .get(
                        `/api/projects/${nonexistentId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(response.statusCode)
                .toBe(404);

            expect(response.body.message)
                .toBe('Project not found.');
        }
    );

    test(
        'DELETE /api/projects/:id removes an owned Project',
        async () => {
            const response =
                await request(app)
                    .delete(
                        `/api/projects/${projectId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(response.statusCode)
                .toBe(200);

            expect(response.body.status)
                .toBe('success');

            expect(response.body.message)
                .toBe(
                    'Project deleted successfully.'
                );
        }
    );

    test(
        'returns 404 when retrieving a deleted Project',
        async () => {
            const response =
                await request(app)
                    .get(
                        `/api/projects/${projectId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(response.statusCode)
                .toBe(404);

            expect(response.body.message)
                .toBe('Project not found.');
        }
    );
});
