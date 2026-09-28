/**
 * TeamForge AI - Repository Secret Guard
 *
 * Prevents known local environment files containing credentials
 * from being committed to Git.
 *
 * This is a deterministic CI defence-in-depth check and does not
 * replace a dedicated secret scanning solution.
 */

const {
    execFileSync,
} = require('child_process');

const forbiddenFiles = [
    '.env',
    '.env.test',
];

let trackedFiles;

try {
    trackedFiles =
        execFileSync(
            'git',
            ['ls-files'],
            {
                encoding: 'utf8',
            }
        )
            .split(/\r?\n/)
            .filter(Boolean);
} catch {
    console.error(
        'Unable to inspect Git tracked files.'
    );

    process.exit(1);
}

const violations =
    forbiddenFiles.filter(
        (file) =>
            trackedFiles.includes(file)
    );

if (violations.length > 0) {
    console.error(
        'SECURITY GATE FAILED: environment secret files are tracked by Git.'
    );

    violations.forEach(
        (file) => {
            console.error(
                ` - ${file}`
            );
        }
    );

    process.exit(1);
}

console.log(
    'Secret-file tracking check passed.'
);
