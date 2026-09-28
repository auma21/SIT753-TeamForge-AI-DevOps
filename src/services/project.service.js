/**
 * TeamForge AI - Project Service
 *
 * Implements Project business rules independently of Express
 * and PostgreSQL-specific request handling.
 */

const projectRepository = require("../repositories/project.repository");

const AppError = require("../utils/AppError");

/**
 * Create a project for the authenticated user.
 */
async function createProject({ name, description, status, ownerId }) {
  return projectRepository.create({
    name,
    description,
    status,
    ownerId,
  });
}

/**
 * Retrieve all projects belonging to the authenticated user.
 */
async function getProjects(ownerId) {
  return projectRepository.findAllByOwner(ownerId);
}

/**
 * Retrieve one project.
 *
 * A generic 404 is returned whether the project does not exist
 * or belongs to another user. This avoids unnecessarily exposing
 * information about resources owned by other accounts.
 */
async function getProject(id, ownerId) {
  const project = await projectRepository.findByIdAndOwner(id, ownerId);

  if (!project) {
    throw new AppError("Project not found.", 404);
  }

  return project;
}

/**
 * Partially update a project.
 */
async function updateProject(id, ownerId, updates) {
  /*
   * Retrieve the project first to verify existence and ownership
   * and to obtain values for properties omitted by PATCH.
   */
  const existingProject = await getProject(id, ownerId);

  const project = await projectRepository.update({
    id,
    ownerId,

    name: updates.name !== undefined ? updates.name : existingProject.name,

    description:
      updates.description !== undefined
        ? updates.description
        : existingProject.description,

    status:
      updates.status !== undefined ? updates.status : existingProject.status,
  });

  if (!project) {
    throw new AppError("Project could not be updated.", 404);
  }

  return project;
}

/**
 * Delete an owned project.
 */
async function deleteProject(id, ownerId) {
  /*
   * Verify that the project exists and belongs to the
   * authenticated user before deleting it.
   */
  await getProject(id, ownerId);

  const deletedProject = await projectRepository.remove(id, ownerId);

  if (!deletedProject) {
    throw new AppError("Project could not be deleted.", 404);
  }

  return deletedProject;
}

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
};
