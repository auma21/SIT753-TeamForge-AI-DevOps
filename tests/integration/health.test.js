/**
 * TeamForge AI - Health Endpoint Integration Tests
 */

const request = require("supertest");

const app = require("../../src/app");

const { closeDatabase } = require("../helpers/database");

describe("GET /health", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  test("returns HTTP 200 when application and database are healthy", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);

    expect(response.body.status).toBe("UP");

    expect(response.body.service).toBe("TeamForge AI");

    expect(response.body.database).toBe("UP");

    expect(response.body.environment).toBe("test");
  });
  test("serves the TeamForge AI frontend", async () => {
    const response = await request(app).get("/");

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/html/);
    expect(response.text).toContain("TeamForge AI");
    expect(response.text).toContain("Implemented MVP");
  });

  test("returns HTTP 404 for an unknown application route", async () => {
    const response = await request(app).get("/this-route-does-not-exist");

    expect(response.statusCode).toBe(404);

    expect(response.body).toEqual({
      status: "error",
      message: "Route not found: GET /this-route-does-not-exist",
    });
  });
  
});
