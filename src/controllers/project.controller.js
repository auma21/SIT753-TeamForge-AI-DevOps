/**
 * TeamForge AI - Project Controller
 *
 * Handles HTTP concerns for Project operations.
 *
 * Controllers intentionally remain thin:
 *
 * HTTP request -> Controller -> Service -> Repository -> PostgreSQL
 *
 */

const projectService = require("../services/project.service");

const asyncHandler = require("../utils/asyncHandler");

/**
 * POST /api/projects
 *
 * Create a project belonging to the authenticated user.
 */
const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject({
    name: req.body.name,
    description: req.body.description,
    status: req.body.status,

    /*
     * Never trust an owner ID supplied by the client.
     * Ownership is derived from the authenticated JWT.
     */
    ownerId: req.user.id,
  });

  return res.status(201).json({
    status: "success",
    message: "Project created successfully.",
    data: {
      project,
    },
  });
});

/**
 * GET /api/projects
 *
 * Return projects owned by the authenticated user.
 */
const getProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getProjects(req.user.id);

  return res.status(200).json({
    status: "success",
    results: projects.length,
    data: {
      projects,
    },
  });
});

/**
 * GET /api/projects/:id
 */
const getProject = asyncHandler(async (req, res) => {
  const project = await projectService.getProject(req.params.id, req.user.id);

  return res.status(200).json({
    status: "success",
    data: {
      project,
    },
  });
});

/**
 * PATCH /api/projects/:id
 *
 * Update one or more project properties.
 */
const updateProject = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(
    req.params.id,
    req.user.id,
    {
      name: req.body.name,
      description: req.body.description,
      status: req.body.status,
    },
  );

  return res.status(200).json({
    status: "success",
    message: "Project updated successfully.",
    data: {
      project,
    },
  });
});

/**
 * DELETE /api/projects/:id
 */
const deleteProject = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.id, req.user.id);

  return res.status(200).json({
    status: "success",
    message: "Project deleted successfully.",
  });
});

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
};
