/**
 * TeamForge AI - Task Routes
 *
 * Provides operations on individual Agile backlog tasks.
 *
 * Endpoints:
 * GET    /api/tasks/:id
 * PATCH  /api/tasks/:id
 * DELETE /api/tasks/:id
 *
 * Authentication is required for every endpoint. TaskService
 * additionally verifies ownership of the Project containing
 * the requested Task.
 */

const express = require("express");

const taskController = require("../controllers/task.controller");

const authenticate = require("../middleware/authenticate");

const validate = require("../middleware/validate");

const {
  taskIdValidator,
  updateTaskValidator,
} = require("../validators/task.validator");

const router = express.Router();

/*
 * Protect all Task endpoints using JWT authentication.
 */
router.use(authenticate);

/**
 * Individual Task resource.
 */
router
  .route("/:id")
  .get(taskIdValidator, validate, taskController.getTask)
  .patch(updateTaskValidator, validate, taskController.updateTask)
  .delete(taskIdValidator, validate, taskController.deleteTask);

module.exports = router;
