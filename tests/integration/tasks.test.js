/**
 * TeamForge AI - Task CRUD Integration Tests
 *
 * Exercises the complete Agile Task/Backlog API against the
 * dedicated PostgreSQL test database.
 *
 * Coverage includes:
 * - authentication enforcement;
 * - Task creation;
 * - UUID relationships;
 * - Task retrieval;
 * - workflow updates;
 * - priority updates;
 * - assignment/unassignment;
 * - request validation;
 * - deletion;
 * - PostgreSQL cascade deletion.
 */

const request = require('supertest');

const app = require('../../src/app');

const {
    clearDatabase,
    closeDatabase,
} = require('../helpers/database');

describe('Task CRUD API', () => {
    const testUser = {
        name: 'Task Test User',
        email: 'tasks@teamforge.ai',
        password: 'TeamForge123',
    };

    let accessToken;
    let userId;
    let projectId;
    let taskId;

    /**
     * Prepare an authenticated user and parent Project.
     *
     * Tasks cannot exist independently because every Task must
     * reference a valid Project UUID.
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

        const project =
            await request(app)
                .post('/api/projects')
                .set(
                    'Authorization',
                    `Bearer ${accessToken}`
                )
                .send({
                    name:
                        'Task Integration Project',
                    description:
                        'Parent Project for automated Task CRUD testing.',
                    status:
                        'active',
                });

        expect(project.statusCode)
            .toBe(201);

        projectId =
            project.body.data.project.id;
    });

    /**
     * Remove test data and close PostgreSQL connections after
     * this isolated suite finishes.
     */
    afterAll(async () => {
        await clearDatabase();
        await closeDatabase();
    });

    test(
        'GET Project Tasks rejects unauthenticated requests',
        async () => {
            const response =
                await request(app)
                    .get(
                        `/api/projects/${projectId}/tasks`
                    );

            expect(response.statusCode)
                .toBe(401);

            expect(response.body.status)
                .toBe('error');
        }
    );

    test(
        'POST creates a backlog Task with UUID relationships',
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
                        title:
                            'Implement Jenkins CI/CD Pipeline',
                        description:
                            'Automate Build, Test, Code Quality, Security, Deploy, Release and Monitoring.',
                        priority:
                            'high',
                        status:
                            'backlog',
                    });

            expect(response.statusCode)
                .toBe(201);

            expect(response.body.status)
                .toBe('success');

            expect(response.body.message)
                .toBe(
                    'Task created successfully.'
                );

            const task =
                response.body.data.task;

            /*
             * Verify UUID identity.
             */
            expect(task.id)
                .toEqual(expect.any(String));

            expect(task.id)
                .toMatch(
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
                );

            /*
             * Verify relational UUIDs.
             */
            expect(task.project_id)
                .toBe(projectId);

            expect(task.created_by)
                .toBe(userId);

            expect(task.assigned_to)
                .toBeNull();

            expect(task.priority)
                .toBe('high');

            expect(task.status)
                .toBe('backlog');

            taskId = task.id;
        }
    );

    test(
        'GET Project Tasks returns the created Task',
        async () => {
            const response =
                await request(app)
                    .get(
                        `/api/projects/${projectId}/tasks`
                    )
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

            expect(response.body.data.tasks)
                .toHaveLength(1);

            expect(
                response.body.data.tasks[0].id
            ).toBe(taskId);
        }
    );

    test(
        'GET /api/tasks/:id returns an individual Task',
        async () => {
            const response =
                await request(app)
                    .get(
                        `/api/tasks/${taskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(response.statusCode)
                .toBe(200);

            expect(response.body.status)
                .toBe('success');

            expect(response.body.data.task.id)
                .toBe(taskId);

            expect(
                response.body.data.task.project_id
            ).toBe(projectId);
        }
    );

    test(
        'PATCH updates Task workflow status and priority',
        async () => {
            const response =
                await request(app)
                    .patch(
                        `/api/tasks/${taskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        status:
                            'in-progress',
                        priority:
                            'critical',
                    });

            expect(response.statusCode)
                .toBe(200);

            expect(response.body.status)
                .toBe('success');

            expect(
                response.body.data.task.status
            ).toBe('in-progress');

            expect(
                response.body.data.task.priority
            ).toBe('critical');

            /*
             * Fields omitted from PATCH must remain unchanged.
             */
            expect(
                response.body.data.task.title
            ).toBe(
                'Implement Jenkins CI/CD Pipeline'
            );
        }
    );

    test(
        'assigns a Task to an existing UUID user',
        async () => {
            const response =
                await request(app)
                    .patch(
                        `/api/tasks/${taskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        assignedTo:
                            userId,
                    });

            expect(response.statusCode)
                .toBe(200);

            expect(
                response.body.data.task.assigned_to
            ).toBe(userId);
        }
    );

    test(
        'supports explicit Task unassignment using null',
        async () => {
            const response =
                await request(app)
                    .patch(
                        `/api/tasks/${taskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        assignedTo:
                            null,
                    });

            expect(response.statusCode)
                .toBe(200);

            expect(
                response.body.data.task.assigned_to
            ).toBeNull();
        }
    );

    test(
        'rejects unsupported Task status values',
        async () => {
            const response =
                await request(app)
                    .patch(
                        `/api/tasks/${taskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        status:
                            'finished',
                    });

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
        'rejects unsupported Task priority values',
        async () => {
            const response =
                await request(app)
                    .patch(
                        `/api/tasks/${taskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        priority:
                            'urgent',
                    });

            expect(response.statusCode)
                .toBe(400);

            expect(response.body.status)
                .toBe('error');
        }
    );

    test(
        'rejects malformed Task UUIDs',
        async () => {
            const response =
                await request(app)
                    .get('/api/tasks/123')
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(response.statusCode)
                .toBe(400);

            expect(response.body.message)
                .toBe(
                    'Request validation failed.'
                );
        }
    );

    test(
        'rejects an assignee UUID that does not identify a user',
        async () => {
            const fakeUserId =
                '11111111-1111-4111-8111-111111111111';

            const response =
                await request(app)
                    .patch(
                        `/api/tasks/${taskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        assignedTo:
                            fakeUserId,
                    });

            expect(response.statusCode)
                .toBe(400);

            expect(response.body.message)
                .toBe(
                    'Assigned user not found.'
                );
        }
    );

    test(
        'rejects Task creation for a nonexistent Project',
        async () => {
            const fakeProjectId =
                '11111111-1111-4111-8111-111111111111';

            const response =
                await request(app)
                    .post(
                        `/api/projects/${fakeProjectId}/tasks`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        title:
                            'Invalid Project Task',
                        priority:
                            'medium',
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
        'DELETE /api/tasks/:id removes an owned Task',
        async () => {
            /*
             * Create a separate Task so the primary Task remains
             * available for subsequent cascade testing.
             */
            const creation =
                await request(app)
                    .post(
                        `/api/projects/${projectId}/tasks`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        title:
                            'Temporary Delete Test',
                        description:
                            'Created only to verify DELETE.',
                        priority:
                            'low',
                        status:
                            'backlog',
                    });

            expect(creation.statusCode)
                .toBe(201);

            const temporaryTaskId =
                creation.body.data.task.id;

            const deletion =
                await request(app)
                    .delete(
                        `/api/tasks/${temporaryTaskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(deletion.statusCode)
                .toBe(200);

            expect(deletion.body.message)
                .toBe(
                    'Task deleted successfully.'
                );

            const retrieval =
                await request(app)
                    .get(
                        `/api/tasks/${temporaryTaskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(retrieval.statusCode)
                .toBe(404);

            expect(retrieval.body.message)
                .toBe('Task not found.');
        }
    );

    test(
        'deleting a Project cascades deletion to its Tasks',
        async () => {
            /*
             * Confirm the primary Task exists before deleting
             * its parent Project.
             */
            const beforeDeletion =
                await request(app)
                    .get(
                        `/api/tasks/${taskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(beforeDeletion.statusCode)
                .toBe(200);

            /*
             * PostgreSQL's ON DELETE CASCADE should remove every
             * Task associated with this Project.
             */
            const projectDeletion =
                await request(app)
                    .delete(
                        `/api/projects/${projectId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(projectDeletion.statusCode)
                .toBe(200);

            const afterDeletion =
                await request(app)
                    .get(
                        `/api/tasks/${taskId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(afterDeletion.statusCode)
                .toBe(404);

            expect(afterDeletion.body.message)
                .toBe('Task not found.');
        }
    );
});