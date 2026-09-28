/**
 * TeamForge AI - Project Task Routes
 *
 * Provides nested Task endpoints associated with a specific
 * Project.
 *
 * Endpoints:
 * GET  /api/projects/:projectId/tasks
 * POST /api/projects/:projectId/tasks
 *
 * All routes require JWT authentication and Project ownership
 * is subsequently verified by the Task service layer.
 */

const express = require("express");

const taskController = require("../controllers/task.controller");

const authenticate = require("../middleware/authenticate");

const validate = require("../middleware/validate");

const {
  projectIdValidator,
  createTaskValidator,
} = require("../validators/task.validator");

const router = express.Router();

/*
 * Every Project Task endpoint declared below requires a
 * successfully authenticated TeamForge AI user.
 */
router.use(authenticate);

/**
 * Project Task collection.
 *
 * GET /api/projects/:projectId/tasks
 *     Retrieve tasks belonging to an owned Project.
 *
 * POST /api/projects/:projectId/tasks
 *     Create a Task inside an owned Project.
 */
router
  .route("/:projectId/tasks")
  .get(projectIdValidator, validate, taskController.getProjectTasks)
  .post(createTaskValidator, validate, taskController.createTask);

module.exports = router;
