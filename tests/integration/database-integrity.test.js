/**
 * TeamForge AI - Database Integrity Integration Tests
 *
 * CI QUALITY GATE:
 * Verifies relational constraints and UUID behaviour directly
 * against the dedicated PostgreSQL test database.
 *
 * Application validation is important, but database constraints
 * provide an independent final integrity boundary.
 */

const request = require('supertest');

const app = require('../../src/app');

const pool =
    require('../../src/config/database');

const {
    clearDatabase,
    closeDatabase,
} = require('../helpers/database');

describe('CI Gate - PostgreSQL Data Integrity', () => {
    let accessToken;
    let userId;
    let projectId;

    beforeAll(async () => {
        await clearDatabase();

        const registration =
            await request(app)
                .post('/api/auth/register')
                .send({
                    name:
                        'Database Integrity User',
                    email:
                        'database-gate@teamforge.ai',
                    password:
                        'TeamForge123',
                });

        expect(registration.statusCode)
            .toBe(201);

        userId =
            registration.body.data.user.id;

        const login =
            await request(app)
                .post('/api/auth/login')
                .send({
                    email:
                        'database-gate@teamforge.ai',
                    password:
                        'TeamForge123',
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
                        'Database Integrity Project',
                    status:
                        'active',
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
        'PostgreSQL generates UUID primary keys for users',
        async () => {
            const result =
                await pool.query(
                    `
                    SELECT id
                    FROM users
                    WHERE id = $1
                    `,
                    [userId]
                );

            expect(result.rows)
                .toHaveLength(1);

            expect(result.rows[0].id)
                .toMatch(
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
                );
        }
    );

    test(
        'PostgreSQL generates unique UUIDs for independent Projects',
        async () => {
            const secondProject =
                await request(app)
                    .post('/api/projects')
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    )
                    .send({
                        name:
                            'Second Integrity Project',
                    });

            expect(secondProject.statusCode)
                .toBe(201);

            expect(
                secondProject.body.data.project.id
            ).not.toBe(projectId);
        }
    );

    test(
        'database UNIQUE constraint rejects duplicate email values',
        async () => {
            /*
             * This deliberately bypasses application duplicate
             * checking to verify PostgreSQL itself protects the
             * uniqueness invariant.
             */
            await expect(
                pool.query(
                    `
                    INSERT INTO users (
                        name,
                        email,
                        password_hash
                    )
                    VALUES ($1, $2, $3)
                    `,
                    [
                        'Duplicate User',
                        'database-gate@teamforge.ai',
                        'test-hash',
                    ]
                )
            ).rejects.toMatchObject({
                code: '23505',
            });
        }
    );

    test(
        'database foreign key rejects a Project with nonexistent owner',
        async () => {
            const fakeOwnerId =
                '11111111-1111-4111-8111-111111111111';

            await expect(
                pool.query(
                    `
                    INSERT INTO projects (
                        name,
                        status,
                        owner_id
                    )
                    VALUES ($1, $2, $3)
                    `,
                    [
                        'Invalid Owner Project',
                        'active',
                        fakeOwnerId,
                    ]
                )
            ).rejects.toMatchObject({
                /*
                 * PostgreSQL foreign_key_violation.
                 */
                code: '23503',
            });
        }
    );

    test(
        'database CHECK constraint rejects unsupported Project status',
        async () => {
            await expect(
                pool.query(
                    `
                    INSERT INTO projects (
                        name,
                        status,
                        owner_id
                    )
                    VALUES ($1, $2, $3)
                    `,
                    [
                        'Invalid Status Project',
                        'destroyed',
                        userId,
                    ]
                )
            ).rejects.toMatchObject({
                /*
                 * PostgreSQL check_violation.
                 */
                code: '23514',
            });
        }
    );

    test(
        'database foreign key rejects Task with nonexistent Project',
        async () => {
            const fakeProjectId =
                '22222222-2222-4222-8222-222222222222';

            await expect(
                pool.query(
                    `
                    INSERT INTO tasks (
                        project_id,
                        title,
                        priority,
                        status,
                        created_by
                    )
                    VALUES ($1, $2, $3, $4, $5)
                    `,
                    [
                        fakeProjectId,
                        'Invalid Relational Task',
                        'medium',
                        'backlog',
                        userId,
                    ]
                )
            ).rejects.toMatchObject({
                code: '23503',
            });
        }
    );

    test(
        'database CHECK constraint rejects invalid Task priority',
        async () => {
            await expect(
                pool.query(
                    `
                    INSERT INTO tasks (
                        project_id,
                        title,
                        priority,
                        status,
                        created_by
                    )
                    VALUES ($1, $2, $3, $4, $5)
                    `,
                    [
                        projectId,
                        'Invalid Priority Task',
                        'extreme',
                        'backlog',
                        userId,
                    ]
                )
            ).rejects.toMatchObject({
                code: '23514',
            });
        }
    );

    test(
        'deleting a Project cascades deletion to its Tasks',
        async () => {
            const task =
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
                            'Database Cascade Gate Task',
                        priority:
                            'medium',
                        status:
                            'backlog',
                    });

            expect(task.statusCode)
                .toBe(201);

            const taskId =
                task.body.data.task.id;

            const before =
                await pool.query(
                    `
                    SELECT id
                    FROM tasks
                    WHERE id = $1
                    `,
                    [taskId]
                );

            expect(before.rows)
                .toHaveLength(1);

            const deletion =
                await request(app)
                    .delete(
                        `/api/projects/${projectId}`
                    )
                    .set(
                        'Authorization',
                        `Bearer ${accessToken}`
                    );

            expect(deletion.statusCode)
                .toBe(200);

            const after =
                await pool.query(
                    `
                    SELECT id
                    FROM tasks
                    WHERE id = $1
                    `,
                    [taskId]
                );

            expect(after.rows)
                .toHaveLength(0);
        }
    );
});
