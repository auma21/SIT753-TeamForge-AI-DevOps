/**
 * TeamForge AI - Task Service Unit Tests
 *
 * Tests Task business rules and ownership checks independently
 * from PostgreSQL and Express.
 */

const taskRepository = require("../../src/repositories/task.repository");

const projectRepository = require("../../src/repositories/project.repository");

const userRepository = require("../../src/repositories/user.repository");

const taskService = require("../../src/services/task.service");

jest.mock("../../src/repositories/task.repository");

jest.mock("../../src/repositories/project.repository");

jest.mock("../../src/repositories/user.repository");

describe("TaskService", () => {
  const ownerId = "11111111-1111-4111-8111-111111111111";

  const projectId = "22222222-2222-4222-8222-222222222222";

  const taskId = "33333333-3333-4333-8333-333333333333";

  const project = {
    id: projectId,
    owner_id: ownerId,
    name: "TeamForge AI",
  };

  const task = {
    id: taskId,
    project_id: projectId,
    title: "Implement Jenkins",
    description: "Pipeline work",
    priority: "high",
    status: "backlog",
    assigned_to: null,
    created_by: ownerId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("creates a Task only after verifying Project ownership", async () => {
    projectRepository.findByIdAndOwner.mockResolvedValue(project);

    taskRepository.create.mockResolvedValue(task);

    const result = await taskService.createTask({
      projectId,
      ownerId,
      title: "Implement Jenkins",
      description: "Pipeline work",
      priority: "high",
      status: "backlog",
      assignedTo: null,
    });

    expect(projectRepository.findByIdAndOwner).toHaveBeenCalledWith(
      projectId,
      ownerId,
    );

    expect(taskRepository.create).toHaveBeenCalledWith({
      projectId,
      title: "Implement Jenkins",
      description: "Pipeline work",
      priority: "high",
      status: "backlog",
      assignedTo: null,
      createdBy: ownerId,
    });

    expect(result).toEqual(task);
  });

  test("rejects Task creation when Project is not owned", async () => {
    projectRepository.findByIdAndOwner.mockResolvedValue(undefined);

    await expect(
      taskService.createTask({
        projectId,
        ownerId,
        title: "Unauthorized Task",
        priority: "high",
        status: "backlog",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Project not found.",
    });

    expect(taskRepository.create).not.toHaveBeenCalled();
  });

  test("rejects assignment to a nonexistent user", async () => {
    projectRepository.findByIdAndOwner.mockResolvedValue(project);

    userRepository.findById.mockResolvedValue(undefined);

    await expect(
      taskService.createTask({
        projectId,
        ownerId,
        title: "Assigned Task",
        priority: "medium",
        status: "backlog",
        assignedTo: "44444444-4444-4444-8444-444444444444",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Assigned user not found.",
    });
  });

  test("returns an owned Task", async () => {
    taskRepository.findById.mockResolvedValue(task);

    projectRepository.findByIdAndOwner.mockResolvedValue(project);

    const result = await taskService.getTask(taskId, ownerId);

    expect(result).toEqual(task);
  });

  test("hides Tasks belonging to another user", async () => {
    taskRepository.findById.mockResolvedValue(task);

    projectRepository.findByIdAndOwner.mockResolvedValue(undefined);

    await expect(taskService.getTask(taskId, ownerId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Task not found.",
    });
  });

  test("throws 404 when Task persistence fails during update", async () => {
    taskRepository.findById.mockResolvedValue(task);

    projectRepository.findByIdAndOwner.mockResolvedValue(project);

    taskRepository.update.mockResolvedValue(undefined);

    await expect(
      taskService.updateTask(taskId, ownerId, {
        status: "in-progress",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Task could not be updated.",
    });
  });

  test("PATCH preserves omitted Task properties", async () => {
    taskRepository.findById.mockResolvedValue(task);

    projectRepository.findByIdAndOwner.mockResolvedValue(project);

    taskRepository.update.mockResolvedValue({
      ...task,
      status: "in-progress",
    });

    const result = await taskService.updateTask(taskId, ownerId, {
      status: "in-progress",
    });

    expect(taskRepository.update).toHaveBeenCalledWith({
      id: taskId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: "in-progress",
      assignedTo: task.assigned_to,
    });

    expect(result.status).toBe("in-progress");
  });

  test("throws 404 when Task persistence fails during deletion", async () => {
    taskRepository.findById.mockResolvedValue(task);

    projectRepository.findByIdAndOwner.mockResolvedValue(project);

    taskRepository.remove.mockResolvedValue(undefined);

    await expect(taskService.deleteTask(taskId, ownerId)).rejects.toMatchObject(
      {
        statusCode: 404,
        message: "Task could not be deleted.",
      },
    );
  });
  test("deletes an owned Task", async () => {
    taskRepository.findById.mockResolvedValue(task);

    projectRepository.findByIdAndOwner.mockResolvedValue(project);

    taskRepository.remove.mockResolvedValue({
      id: taskId,
    });

    const result = await taskService.deleteTask(taskId, ownerId);

    expect(taskRepository.remove).toHaveBeenCalledWith(taskId);

    expect(result.id).toBe(taskId);
  });
});
