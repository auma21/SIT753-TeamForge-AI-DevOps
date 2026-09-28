/**
 * TeamForge AI - Task Validation
 *
 * Defines validation rules for Agile backlog/task API requests.
 *
 * All TeamForge domain identifiers use UUIDs. Validation occurs
 * before controller execution so malformed input does not reach
 * business logic or PostgreSQL.
 */

const { body, param } = require("express-validator");

/**
 * Validate a Task UUID supplied through /api/tasks/:id.
 */
const taskIdValidator = [
  param("id").isUUID().withMessage("Task ID must be a valid UUID."),
];

/**
 * Validate a Project UUID supplied through
 * /api/projects/:projectId/tasks.
 */
const projectIdValidator = [
  param("projectId").isUUID().withMessage("Project ID must be a valid UUID."),
];

/**
 * Validate task creation requests.
 */
const createTaskValidator = [
  ...projectIdValidator,

  body("title")
    .trim()
    .notEmpty()
    .withMessage("Task title is required.")
    .isLength({ min: 2, max: 200 })
    .withMessage("Task title must contain between 2 and 200 characters."),

  body("description")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 4000 })
    .withMessage("Task description cannot exceed 4000 characters."),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Task priority must be low, medium, high or critical."),

  body("status")
    .optional()
    .isIn(["backlog", "todo", "in-progress", "review", "done"])
    .withMessage(
      "Task status must be backlog, todo, in-progress, review or done.",
    ),

  body("assignedTo")
    .optional({ nullable: true })
    .isUUID()
    .withMessage("Assigned user ID must be a valid UUID."),
];

/**
 * Validate task update requests.
 *
 * PATCH permits partial updates, therefore each body property
 * is optional.
 */
const updateTaskValidator = [
  ...taskIdValidator,

  body("title")
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Task title must contain between 2 and 200 characters."),

  body("description")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 4000 })
    .withMessage("Task description cannot exceed 4000 characters."),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Task priority must be low, medium, high or critical."),

  body("status")
    .optional()
    .isIn(["backlog", "todo", "in-progress", "review", "done"])
    .withMessage(
      "Task status must be backlog, todo, in-progress, review or done.",
    ),

  body("assignedTo")
    .optional({ nullable: true })
    .isUUID()
    .withMessage("Assigned user ID must be a valid UUID."),
];

module.exports = {
  taskIdValidator,
  projectIdValidator,
  createTaskValidator,
  updateTaskValidator,
};
