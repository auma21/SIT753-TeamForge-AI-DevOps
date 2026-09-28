/**
 * TeamForge AI - Project Validation
 *
 * Defines validation rules for Project API requests.
 * TeamForge AI uses UUID identifiers for all domain entities.
 *
 * Validation occurs before controller execution so malformed
 * requests do not reach the service or persistence layers.
 */

const { body, param } = require("express-validator");

/**
 * Validate a project UUID supplied through the URL.
 *
 * Example:
 * /api/projects/550e8400-e29b-41d4-a716-446655440000
 */
const projectIdValidator = [
  param("id").isUUID().withMessage("Project ID must be a valid UUID."),
];

/**
 * Validate POST /api/projects.
 */
const createProjectValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Project name is required.")
    .isLength({ min: 2, max: 150 })
    .withMessage("Project name must contain between 2 and 150 characters."),

  body("description")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Project description cannot exceed 2000 characters."),

  body("status")
    .optional()
    .isIn(["active", "on-hold", "completed", "archived"])
    .withMessage(
      "Project status must be active, on-hold, completed or archived.",
    ),
];

/**
 * Validate PATCH /api/projects/:id.
 *
 * PATCH allows partial updates, therefore individual body
 * properties are optional.
 */
const updateProjectValidator = [
  ...projectIdValidator,

  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage("Project name must contain between 2 and 150 characters."),

  body("description")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Project description cannot exceed 2000 characters."),

  body("status")
    .optional()
    .isIn(["active", "on-hold", "completed", "archived"])
    .withMessage(
      "Project status must be active, on-hold, completed or archived.",
    ),
];

module.exports = {
  projectIdValidator,
  createProjectValidator,
  updateProjectValidator,
};
