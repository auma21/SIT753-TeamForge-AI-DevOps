/**
 * TeamForge AI - Ownership Authorization Integration Tests
 *
 * Verifies resource-level authorization between independent users.
 *
 * Authentication answers:
 *     "Who is making this request?"
 *
 * Authorization answers:
 *     "May this authenticated user access this resource?"
 *
 * These tests ensure User B cannot read, modify or delete
 * Projects or Tasks owned by User A.
 */

const request = require('supertest');

const app = require('../../src/app');

const {
    clearDatabase,
    closeDatabase,
} = require('../helpers/database');

describe('Cross-user ownership authorization', () => {
    let userAToken;
    let userBToken;

    let userAProjectId;
    let userATaskId;

    /**
     * Create two independent users.
     *
     * User A owns the Project and Task used throughout this suite.
     * User B attempts unauthorized access.
     */
    beforeAll(async () => {
        await clearDatabase();

        // --------------------------------------------------------
        // Create and authenticate User A.
        // --------------------------------------------------------

        const registrationA =
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'TeamForge User A',
                    email: 'usera@teamforge.ai',
                    password: 'TeamForge123',
                });

        expect(registrationA.statusCode)
            .toBe(201);

        const loginA =
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'usera@teamforge.ai',
                    password: 'TeamForge123',
                });

        expect(loginA.statusCode)
            .toBe(200);

        userAToken =
            loginA.body.data.token;

        // --------------------------------------------------------
        // Create and authenticate User B.
        // --------------------------------------------------------

        const registrationB =
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'TeamForge User B',
                    email: 'userb@teamforge.ai',
                    password: 'TeamForge456',
                });

        expect(registrationB.statusCode)
            .toBe(201);

        const loginB =
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'userb@teamforge.ai',
                    password: 'TeamForge456',
                });

        expect(loginB.statusCode)
            .toBe(200);

        userBToken =
            loginB.body.data.token;

        // --------------------------------------------------------
        // User A creates a Project.
        // --------------------------------------------------------

        const project =
            await request(app)
                .post('/api/projects')
                .set(
                    'Authorization',
                    `Bearer ${userAToken}`
                )
                .send({
                    name:
                        'User A Private Project',
                    description:
                        'Project used for ownership authorization testing.',
                    status:
                        'active',
                });

        expect(project.statusCode)
            .toBe(201);

        userAProjectId =
            project.body.data.project.id;

        // --------------------------------------------------------
        // User A creates a Task inside the Project.
        // --------------------------------------------------------

        const task =
            await request(app)
                .post(
                    `/api/projects/${userAProjectId}/tasks`
                )
                .set(
                    'Authorization',
                    `Bearer ${userAToken}`
                )
                .send({
                    title:
                        'User A Private Task',
                    description:
                        'Task used for authorization testing.',
                    priority:
                        'high',
                    status:
                        'backlog',
                });

        expect(task.statusCode)
            .toBe(201);

        userATaskId =
            task.body.data.task.id;
    });

    afterAll(async () => {
        await clearDatabase();
        await closeDatabase();
    });

    test(
        'User B cannot read User A Project',
        async () => {
            const response =
                await request(app)
                    .get(
                        `/api/projects/${userAProjectId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${userBToken}`
                    );

            /*
             * Return 404 rather than revealing that a Project
             * belonging to another account exists.
             */
            expect(response.statusCode)
                .toBe(404);

            expect(response.body.message)
                .toBe('Project not found.');
        }
    );

    test(
        'User B Project list does not expose User A Projects',
        async () => {
            const response =
                await request(app)
                    .get('/api/projects')
                    .set(
                        'Authorization',
                        `Bearer ${userBToken}`
                    );

            expect(response.statusCode)
                .toBe(200);

            expect(response.body.results)
                .toBe(0);

            expect(response.body.data.projects)
                .toHaveLength(0);
        }
    );

    test(
        'User B cannot update User A Project',
        async () => {
            const response =
                await request(app)
                    .patch(
                        `/api/projects/${userAProjectId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${userBToken}`
                    )
                    .send({
                        status: 'archived',
                    });

            expect(response.statusCode)
                .toBe(404);

            expect(response.body.message)
                .toBe('Project not found.');
        }
    );

    test(
        'User B cannot delete User A Project',
        async () => {
            const response =
                await request(app)
                    .delete(
                        `/api/projects/${userAProjectId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${userBToken}`
                    );

            expect(response.statusCode)
                .toBe(404);

            expect(response.body.message)
                .toBe('Project not found.');
        }
    );

    test(
        'User A Project remains unchanged after User B update attempt',
        async () => {
            const response =
                await request(app)
                    .get(
                        `/api/projects/${userAProjectId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${userAToken}`
                    );

            expect(response.statusCode)
                .toBe(200);

            expect(
                response.body.data.project.status
            ).toBe('active');
        }
    );

    test(
        'User B cannot list Tasks from User A Project',
        async () => {
            const response =
                await request(app)
                    .get(
                        `/api/projects/${userAProjectId}/tasks`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${userBToken}`
                    );

            expect(response.statusCode)
                .toBe(404);

            expect(response.body.message)
                .toBe('Project not found.');
        }
    );

    test(
        'User B cannot create a Task inside User A Project',
        async () => {
            const response =
                await request(app)
                    .post(
                        `/api/projects/${userAProjectId}/tasks`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${userBToken}`
                    )
                    .send({
                        title:
                            'Unauthorized Task',
                        priority:
                            'critical',
                        status:
                            'backlog',
                    });

            expect(response.statusCode)
                .toBe(404);

            expect(response.body.message)
                .toBe('Project not found.');
        }
    );

    test(
        'User B cannot read User A Task',
        async () => {
            const response =
                await request(app)
                    .get(
                        `/api/tasks/${userATaskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${userBToken}`
                    );

            expect(response.statusCode)
                .toBe(404);

            expect(response.body.message)
                .toBe('Task not found.');
        }
    );

    test(
        'User B cannot update User A Task',
        async () => {
            const response =
                await request(app)
                    .patch(
                        `/api/tasks/${userATaskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${userBToken}`
                    )
                    .send({
                        status:
                            'done',
                        priority:
                            'low',
                    });

            expect(response.statusCode)
                .toBe(404);

            expect(response.body.message)
                .toBe('Task not found.');
        }
    );

    test(
        'User B cannot delete User A Task',
        async () => {
            const response =
                await request(app)
                    .delete(
                        `/api/tasks/${userATaskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${userBToken}`
                    );

            expect(response.statusCode)
                .toBe(404);

            expect(response.body.message)
                .toBe('Task not found.');
        }
    );

    test(
        'User A Task remains unchanged after User B modification attempts',
        async () => {
            const response =
                await request(app)
                    .get(
                        `/api/tasks/${userATaskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${userAToken}`
                    );

            expect(response.statusCode)
                .toBe(200);

            expect(
                response.body.data.task.status
            ).toBe('backlog');

            expect(
                response.body.data.task.priority
            ).toBe('high');
        }
    );
});