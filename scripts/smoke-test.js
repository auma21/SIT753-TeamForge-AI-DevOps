/**
 * TeamForge AI - Deployment Smoke Test
 *
 * Purpose:
 *   Validate the critical end-to-end application workflow against
 *   an already deployed environment.
 *
 * This is intentionally smaller than the full Jest suite.
 *
 * CI responsibilities:
 *   - verify application/database health;
 *   - register a temporary user;
 *   - authenticate and obtain a JWT;
 *   - verify /me;
 *   - create and retrieve a Project;
 *   - create, update and retrieve a Task;
 *   - verify UUID-based relationships;
 *   - fail immediately on any unexpected HTTP response.
 *
 * Environment:
 *   SMOKE_BASE_URL controls the deployment being tested.
 */

const baseUrl =
    process.env.SMOKE_BASE_URL ||
    'http://localhost:3001';

/**
 * Generate a unique identity so repeated CI executions do not
 * collide with the database UNIQUE(email) constraint.
 */
const uniqueId =
    `${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;

const smokeUser = {
    name: 'TeamForge Smoke Test',
    email: `smoke-${uniqueId}@teamforge.ai`,
    password: 'TeamForge123',
};

/**
 * Fail the deployment gate.
 */
function fail(message) {
    console.error('');
    console.error(
        `SMOKE TEST FAILED: ${message}`
    );

    process.exit(1);
}

/**
 * Send an HTTP request and parse its JSON response.
 */
async function jsonRequest(
    path,
    options = {}
) {
    const response =
        await fetch(
            `${baseUrl}${path}`,
            {
                ...options,

                headers: {
                    'Content-Type':
                        'application/json',

                    ...(options.headers || {}),
                },
            }
        );

    let body;

    try {
        body =
            await response.json();
    } catch {
        body = {};
    }

    if (!response.ok) {
        fail(
            `${options.method || 'GET'} ${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`
        );
    }

    return body;
}

/**
 * Validate a UUID returned by the API.
 */
function isUuid(value) {
    return (
        typeof value === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            .test(value)
    );
}

async function run() {
    console.log(
        '========================================'
    );

    console.log(
        ' TeamForge AI Deployment Smoke Test'
    );

    console.log(
        '========================================'
    );

    console.log(
        `Target: ${baseUrl}`
    );

    // ========================================================
    // 1. Health
    // ========================================================

    const health =
        await jsonRequest('/health');

    if (
        health.status !== 'UP' ||
        health.database !== 'UP'
    ) {
        fail(
            'Application/database health is not UP.'
        );
    }

    console.log(
        'PASS: application and database health'
    );

    // ========================================================
    // 2. Registration
    // ========================================================

    const registration =
        await jsonRequest(
            '/api/auth/register',
            {
                method: 'POST',

                body:
                    JSON.stringify(
                        smokeUser
                    ),
            }
        );

    const userId =
        registration?.data?.user?.id;

    if (!isUuid(userId)) {
        fail(
            'Registration did not return a valid user UUID.'
        );
    }

    console.log(
        'PASS: user registration'
    );

    // ========================================================
    // 3. Login
    // ========================================================

    const login =
        await jsonRequest(
            '/api/auth/login',
            {
                method: 'POST',

                body:
                    JSON.stringify({
                        email:
                            smokeUser.email,

                        password:
                            smokeUser.password,
                    }),
            }
        );

    const token =
        login?.data?.token;

    if (
        typeof token !== 'string' ||
        token.length === 0
    ) {
        fail(
            'Login did not return a JWT.'
        );
    }

    console.log(
        'PASS: authentication'
    );

    const authHeaders = {
        Authorization:
            `Bearer ${token}`,
    };

    // ========================================================
    // 4. Authenticated identity
    // ========================================================

    const me =
        await jsonRequest(
            '/api/auth/me',
            {
                headers:
                    authHeaders,
            }
        );

    if (
        me?.data?.user?.id !==
        userId
    ) {
        fail(
            '/me identity does not match registered user.'
        );
    }

    console.log(
        'PASS: authenticated identity'
    );

    // ========================================================
    // 5. Project creation
    // ========================================================

    const projectResponse =
        await jsonRequest(
            '/api/projects',
            {
                method: 'POST',

                headers:
                    authHeaders,

                body:
                    JSON.stringify({
                        name:
                            'CI Deployment Smoke Project',

                        description:
                            'Automated TeamForge deployment verification.',

                        status:
                            'active',
                    }),
            }
        );

    const project =
        projectResponse
            ?.data
            ?.project;

    const projectId =
        project?.id;

    if (!isUuid(projectId)) {
        fail(
            'Project creation did not return a valid UUID.'
        );
    }

    console.log(
        'PASS: Project creation'
    );

    // ========================================================
    // 6. Project retrieval
    // ========================================================

    const projectRead =
        await jsonRequest(
            `/api/projects/${projectId}`,
            {
                headers:
                    authHeaders,
            }
        );

    if (
        projectRead
            ?.data
            ?.project
            ?.id !==
        projectId
    ) {
        fail(
            'Created Project could not be retrieved.'
        );
    }

    console.log(
        'PASS: Project retrieval'
    );

    // ========================================================
    // 7. Task creation
    // ========================================================

    const taskResponse =
        await jsonRequest(
            `/api/projects/${projectId}/tasks`,
            {
                method: 'POST',

                headers:
                    authHeaders,

                body:
                    JSON.stringify({
                        title:
                            'CI Deployment Smoke Task',

                        description:
                            'Validate Task CRUD after deployment.',

                        priority:
                            'high',

                        status:
                            'backlog',
                    }),
            }
        );

    const task =
        taskResponse
            ?.data
            ?.task;

    const taskId =
        task?.id;

    if (!isUuid(taskId)) {
        fail(
            'Task creation did not return a valid UUID.'
        );
    }

    if (
        task.project_id !==
        projectId
    ) {
        fail(
            'Task is not associated with the expected Project.'
        );
    }

    console.log(
        'PASS: Task creation'
    );

    // ========================================================
    // 8. Task workflow update
    // ========================================================

    const taskUpdate =
        await jsonRequest(
            `/api/tasks/${taskId}`,
            {
                method: 'PATCH',

                headers:
                    authHeaders,

                body:
                    JSON.stringify({
                        status:
                            'in-progress',

                        priority:
                            'critical',
                    }),
            }
        );

    if (
        taskUpdate
            ?.data
            ?.task
            ?.status !==
        'in-progress'
    ) {
        fail(
            'Task workflow status was not updated.'
        );
    }

    if (
        taskUpdate
            ?.data
            ?.task
            ?.priority !==
        'critical'
    ) {
        fail(
            'Task priority was not updated.'
        );
    }

    console.log(
        'PASS: Task update'
    );

    // ========================================================
    // 9. Task retrieval
    // ========================================================

    const taskRead =
        await jsonRequest(
            `/api/tasks/${taskId}`,
            {
                headers:
                    authHeaders,
            }
        );

    if (
        taskRead
            ?.data
            ?.task
            ?.id !==
        taskId
    ) {
        fail(
            'Updated Task could not be retrieved.'
        );
    }

    console.log(
        'PASS: Task retrieval'
    );

    // ========================================================
    // Gate result
    // ========================================================

    console.log('');
    console.log(
        '========================================'
    );

    console.log(
        ' TEAMFORGE SMOKE TEST PASSED'
    );

    console.log(
        '========================================'
    );
}

run().catch(
    (error) => {
        fail(
            error.message
        );
    }
);
