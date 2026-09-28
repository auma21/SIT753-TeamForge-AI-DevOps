/**
 * TeamForge AI - Project Routes
 *
 * All Project endpoints require a valid JWT before any
 * CRUD operation can execute.
 */

const express = require("express");

const projectController = require("../controllers/project.controller");

const authenticate = require("../middleware/authenticate");

const validate = require("../middleware/validate");

const {
  projectIdValidator,
  createProjectValidator,
  updateProjectValidator,
} = require("../validators/project.validator");

const router = express.Router();

/*
 * Apply authentication to every Project endpoint declared below.
 */
router.use(authenticate);

/**
 * Project collection.
 *
 * GET  /api/projects
 * POST /api/projects
 */
router
  .route("/")
  .get(projectController.getProjects)
  .post(createProjectValidator, validate, projectController.createProject);

/**
 * Individual project.
 *
 * GET    /api/projects/:id
 * PATCH  /api/projects/:id
 * DELETE /api/projects/:id
 */
router
  .route("/:id")
  .get(projectIdValidator, validate, projectController.getProject)
  .patch(updateProjectValidator, validate, projectController.updateProject)
  .delete(projectIdValidator, validate, projectController.deleteProject);

module.exports = router;
