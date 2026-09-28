/**
 * TeamForge AI - Task Service
 *
 * Implements Agile backlog business rules and authorization.
 *
 * A user may manipulate a task only when they own the Project
 * containing that task.
 */

const taskRepository = require("../repositories/task.repository");

const projectRepository = require("../repositories/project.repository");

const userRepository = require("../repositories/user.repository");

const AppError = require("../utils/AppError");

/**
 * Verify that a Project exists and belongs to the authenticated
 * user.
 *
 * This helper centralises project-level authorization for Task
 * operations.
 */
async function requireOwnedProject(projectId, ownerId) {
  const project = await projectRepository.findByIdAndOwner(projectId, ownerId);

  if (!project) {
    /*
     * Return the same response for a nonexistent project and
     * a project belonging to another user.
     */
    throw new AppError("Project not found.", 404);
  }

  return project;
}

/**
 * Verify that an optional task assignee exists.
 */
async function validateAssignee(assignedTo) {
  if (!assignedTo) {
    return null;
  }

  const user = await userRepository.findById(assignedTo);

  if (!user) {
    throw new AppError("Assigned user not found.", 400);
  }

  return user;
}

/**
 * Create a Task inside an owned Project.
 */
async function createTask({
  projectId,
  ownerId,
  title,
  description,
  priority,
  status,
  assignedTo,
}) {
  /*
   * Do not create a task unless the authenticated user owns
   * the destination project.
   */
  await requireOwnedProject(projectId, ownerId);

  await validateAssignee(assignedTo);

  return taskRepository.create({
    projectId,
    title,
    description,
    priority,
    status,
    assignedTo,
    createdBy: ownerId,
  });
}

/**
 * Return tasks belonging to an owned Project.
 */
async function getProjectTasks(projectId, ownerId) {
  await requireOwnedProject(projectId, ownerId);

  return taskRepository.findAllByProject(projectId);
}

/**
 * Retrieve a Task while enforcing Project ownership.
 *
 * The API deliberately returns the same "Task not found"
 * response when:
 *
 * - the Task does not exist; or
 * - the Task belongs to a Project the authenticated user
 *   does not own.
 *
 * This avoids exposing resource ownership information.
 */
async function getTask(id, ownerId) {
  const task = await taskRepository.findById(id);

  if (!task) {
    throw new AppError("Task not found.", 404);
  }

  const project = await projectRepository.findByIdAndOwner(
    task.project_id,
    ownerId,
  );

  if (!project) {
    throw new AppError("Task not found.", 404);
  }

  return task;
}

/**
 * Partially update a Task.
 */
async function updateTask(id, ownerId, updates) {
  /*
   * getTask() verifies both Task existence and Project ownership.
   */
  const existingTask = await getTask(id, ownerId);

  /*
   * Only validate the assignee when the caller actually supplied
   * assignedTo. A null value intentionally removes assignment.
   */
  if (updates.assignedTo !== undefined && updates.assignedTo !== null) {
    await validateAssignee(updates.assignedTo);
  }

  const task = await taskRepository.update({
    id,

    title: updates.title !== undefined ? updates.title : existingTask.title,

    description:
      updates.description !== undefined
        ? updates.description
        : existingTask.description,

    priority:
      updates.priority !== undefined ? updates.priority : existingTask.priority,

    status: updates.status !== undefined ? updates.status : existingTask.status,

    assignedTo:
      updates.assignedTo !== undefined
        ? updates.assignedTo
        : existingTask.assigned_to,
  });

  if (!task) {
    throw new AppError("Task could not be updated.", 404);
  }

  return task;
}

/**
 * Delete a Task from an owned Project.
 */
async function deleteTask(id, ownerId) {
  /*
   * This verifies existence and ownership before deletion.
   */
  await getTask(id, ownerId);

  const deletedTask = await taskRepository.remove(id);

  if (!deletedTask) {
    throw new AppError("Task could not be deleted.", 404);
  }

  return deletedTask;
}

module.exports = {
  createTask,
  getProjectTasks,
  getTask,
  updateTask,
  deleteTask,
};
