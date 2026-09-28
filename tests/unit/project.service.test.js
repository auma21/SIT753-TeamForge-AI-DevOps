/**
 * TeamForge AI - Project Service Unit Tests
 *
 * Tests Project business rules independently from PostgreSQL.
 */

const projectRepository = require("../../src/repositories/project.repository");

const projectService = require("../../src/services/project.service");

jest.mock("../../src/repositories/project.repository");

describe("ProjectService", () => {
  const ownerId = "11111111-1111-4111-8111-111111111111";

  const projectId = "22222222-2222-4222-8222-222222222222";

  const existingProject = {
    id: projectId,
    name: "TeamForge AI",
    description: "Original description",
    status: "active",
    owner_id: ownerId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("creates a Project using the authenticated owner UUID", async () => {
    projectRepository.create.mockResolvedValue(existingProject);

    const result = await projectService.createProject({
      name: "TeamForge AI",
      description: "Original description",
      status: "active",
      ownerId,
    });

    expect(projectRepository.create).toHaveBeenCalledWith({
      name: "TeamForge AI",
      description: "Original description",
      status: "active",
      ownerId,
    });

    expect(result).toEqual(existingProject);
  });

  test("returns owned Projects", async () => {
    projectRepository.findAllByOwner.mockResolvedValue([existingProject]);

    const result = await projectService.getProjects(ownerId);

    expect(projectRepository.findAllByOwner).toHaveBeenCalledWith(ownerId);

    expect(result).toHaveLength(1);
  });

  test("returns an owned Project", async () => {
    projectRepository.findByIdAndOwner.mockResolvedValue(existingProject);

    const result = await projectService.getProject(projectId, ownerId);

    expect(result).toEqual(existingProject);
  });

  test("throws 404 when an owned Project cannot be found", async () => {
    projectRepository.findByIdAndOwner.mockResolvedValue(undefined);

    await expect(
      projectService.getProject(projectId, ownerId),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Project not found.",
    });
  });
  test("throws 404 when Project persistence fails during update", async () => {
    /*
     * The Project exists and is owned by the caller.
     */
    projectRepository.findByIdAndOwner.mockResolvedValue(existingProject);

    /*
     * Simulate an unexpected persistence-layer failure where
     * no updated Project is returned.
     */
    projectRepository.update.mockResolvedValue(undefined);

    await expect(
      projectService.updateProject(projectId, ownerId, {
        status: "on-hold",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Project could not be updated.",
    });
  });

  test("PATCH preserves fields omitted by the caller", async () => {
    projectRepository.findByIdAndOwner.mockResolvedValue(existingProject);

    projectRepository.update.mockResolvedValue({
      ...existingProject,
      status: "on-hold",
    });

    const result = await projectService.updateProject(projectId, ownerId, {
      status: "on-hold",
    });

    expect(projectRepository.update).toHaveBeenCalledWith({
      id: projectId,
      ownerId,
      name: existingProject.name,
      description: existingProject.description,
      status: "on-hold",
    });

    expect(result.status).toBe("on-hold");
  });

  test("throws 404 when Project persistence fails during deletion", async () => {
    projectRepository.findByIdAndOwner.mockResolvedValue(existingProject);

    /*
     * Simulate a delete operation that unexpectedly returns
     * no deleted resource.
     */
    projectRepository.remove.mockResolvedValue(undefined);

    await expect(
      projectService.deleteProject(projectId, ownerId),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Project could not be deleted.",
    });
  });

  test("deletes an owned Project", async () => {
    projectRepository.findByIdAndOwner.mockResolvedValue(existingProject);

    projectRepository.remove.mockResolvedValue({
      id: projectId,
    });

    const result = await projectService.deleteProject(projectId, ownerId);

    expect(projectRepository.remove).toHaveBeenCalledWith(projectId, ownerId);

    expect(result.id).toBe(projectId);
  });
});
