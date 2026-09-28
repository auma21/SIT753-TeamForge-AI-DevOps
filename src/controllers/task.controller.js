/**
 * TeamForge AI - Task Controller
 *
 * Handles HTTP concerns for Agile backlog operations while
 * delegating business logic and authorization to TaskService.
 */

const taskService = require("../services/task.service");

const asyncHandler = require("../utils/asyncHandler");

/**
 * POST /api/projects/:projectId/tasks
 *
 * Create a backlog task inside an owned Project.
 */
const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask({
    projectId: req.params.projectId,

    ownerId: req.user.id,

    title: req.body.title,

    description: req.body.description,

    priority: req.body.priority,

    status: req.body.status,

    assignedTo: req.body.assignedTo,
  });

  return res.status(201).json({
    status: "success",
    message: "Task created successfully.",
    data: {
      task,
    },
  });
});

/**
 * GET /api/projects/:projectId/tasks
 */
const getProjectTasks = asyncHandler(async (req, res) => {
  const tasks = await taskService.getProjectTasks(
    req.params.projectId,
    req.user.id,
  );

  return res.status(200).json({
    status: "success",
    results: tasks.length,
    data: {
      tasks,
    },
  });
});

/**
 * GET /api/tasks/:id
 */
const getTask = asyncHandler(async (req, res) => {
  const task = await taskService.getTask(req.params.id, req.user.id);

  return res.status(200).json({
    status: "success",
    data: {
      task,
    },
  });
});

/**
 * PATCH /api/tasks/:id
 */
const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.user.id, {
    title: req.body.title,

    description: req.body.description,

    priority: req.body.priority,

    status: req.body.status,

    assignedTo: req.body.assignedTo,
  });

  return res.status(200).json({
    status: "success",
    message: "Task updated successfully.",
    data: {
      task,
    },
  });
});

/**
 * DELETE /api/tasks/:id
 */
const deleteTask = asyncHandler(async (req, res) => {
  await taskService.deleteTask(req.params.id, req.user.id);

  return res.status(200).json({
    status: "success",
    message: "Task deleted successfully.",
  });
});

module.exports = {
  createTask,
  getProjectTasks,
  getTask,
  updateTask,
  deleteTask,
};
