/**
 * TeamForge AI - ESLint Configuration
 *
 * Provides deterministic static code-quality analysis for
 * production source code and automated tests.
 */

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    /*
     * ESLint's recommended JavaScript rules provide the baseline.
     */
    js.configs.recommended,

    /*
     * Production Node.js source.
     */
    {
        files: [
            'src/**/*.js',
            'scripts/**/*.js',
        ],

        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',

            globals: {
                ...globals.node,
            },
        },

        rules: {
            /*
             * Prevent accidental dead/incomplete code.
             * Arguments intentionally unused should begin with "_".
             */
            'no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                },
            ],

            'no-undef': 'error',

            /*
             * Avoid implicit type coercion during comparisons.
             */
            'eqeqeq': [
                'error',
                'always',
            ],

            /*
             * Require braces around control-flow bodies.
             */
            'curly': [
                'error',
                'all',
            ],
        },
    },

    /*
     * Jest test source.
     */
    {
        files: [
            'tests/**/*.js',
        ],

        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',

            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },

        rules: {
            'no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                },
            ],
        },
    },

    /*
     * Generated/vendor files should not be analysed.
     */
    {
        ignores: [
            'node_modules/**',
            'coverage/**',
            'test-results/**',
            'public/**',
        ],
    },
];
