/**
 * TeamForge AI - Jest Configuration
 *
 * Defines automated test discovery, coverage collection and
 * CI/CD quality gates.
 */

module.exports = {
  testEnvironment: "node",

  roots: ["<rootDir>/tests"],

  testMatch: ["**/*.test.js"],

  reporters: [
    "default",

    [
      "jest-junit",
      {
        outputDirectory: "test-results",
        outputName: "junit.xml",

        /*
         * Include useful hierarchy information in Jenkins.
         */
        suiteNameTemplate: "{filepath}",

        classNameTemplate: "{classname}",

        titleTemplate: "{title}",
      },
    ],
  ],

  /*
   * Run database-backed integration tests sequentially.
   *
   * package.json additionally specifies --runInBand for the
   * Jenkins/CI execution path.
   */
  clearMocks: true,

  verbose: true,

  /*
   * Collect coverage from application source rather than only
   * files imported directly by individual tests.
   */
  collectCoverageFrom: [
    "src/**/*.js",

    /*
     * server.js contains process lifecycle/bootstrap logic.
     * Application behaviour is tested through app.js.
     */
    "!src/server.js",
  ],

  coverageDirectory: "coverage",

  coverageReporters: ["text", "text-summary", "lcov", "json-summary"],

  /*
   * Automated quality gate.
   *
   * If coverage falls below these values, Jest exits with a
   * non-zero status and Jenkins stops the pipeline.
   *
   * These should be reviewed against the first measured
   * full-suite coverage rather than artificially weakened just
   * to obtain a green build.
   */
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 75,
      lines: 80,
    },
  },
};
