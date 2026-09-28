/**
 * TeamForge AI - Authentication Service Unit Tests
 *
 * Tests authentication business logic in isolation.
 * PostgreSQL access is mocked through UserRepository.
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userRepository = require("../../src/repositories/user.repository");

const authService = require("../../src/services/auth.service");

/*
 * Replace repository/database behaviour with Jest mocks.
 */
jest.mock("../../src/repositories/user.repository");

jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    process.env.JWT_SECRET = "unit-test-jwt-secret";

    process.env.JWT_EXPIRES_IN = "1h";
  });

  describe("register()", () => {
    test("creates a user after hashing the password", async () => {
      userRepository.findByEmail.mockResolvedValue(undefined);

      bcrypt.hash.mockResolvedValue("hashed-password");

      const createdUser = {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Unit Test User",
        email: "unit@teamforge.ai",
        role: "member",
      };

      userRepository.create.mockResolvedValue(createdUser);

      const result = await authService.register({
        name: "Unit Test User",
        email: "unit@teamforge.ai",
        password: "TeamForge123",
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        "unit@teamforge.ai",
      );

      expect(bcrypt.hash).toHaveBeenCalledWith("TeamForge123", 12);

      expect(userRepository.create).toHaveBeenCalledWith({
        name: "Unit Test User",
        email: "unit@teamforge.ai",
        passwordHash: "hashed-password",
      });

      expect(result).toEqual(createdUser);
    });

    test("rejects registration when the email already exists", async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        email: "existing@teamforge.ai",
      });

      await expect(
        authService.register({
          name: "Existing User",
          email: "existing@teamforge.ai",
          password: "TeamForge123",
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "An account already exists for this email address.",
      });

      expect(bcrypt.hash).not.toHaveBeenCalled();

      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("login()", () => {
    const storedUser = {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Unit Test User",
      email: "unit@teamforge.ai",
      password_hash: "stored-bcrypt-hash",
      role: "member",
    };

    test("returns a JWT for valid credentials", async () => {
      userRepository.findByEmail.mockResolvedValue(storedUser);

      bcrypt.compare.mockResolvedValue(true);

      jwt.sign.mockReturnValue("mock-jwt-token");

      const result = await authService.login({
        email: "unit@teamforge.ai",
        password: "TeamForge123",
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        "TeamForge123",
        "stored-bcrypt-hash",
      );

      expect(jwt.sign).toHaveBeenCalled();

      expect(result.token).toBe("mock-jwt-token");

      expect(result.user).toEqual({
        id: storedUser.id,
        name: storedUser.name,
        email: storedUser.email,
        role: storedUser.role,
      });
    });

    test("fails authentication when JWT signing secret is unavailable", async () => {
      const originalSecret = process.env.JWT_SECRET;

      try {
        delete process.env.JWT_SECRET;

        userRepository.findByEmail.mockResolvedValue({
          id: "11111111-1111-4111-8111-111111111111",
          name: "Unit Test User",
          email: "unit@teamforge.ai",
          password_hash: "stored-bcrypt-hash",
          role: "member",
        });

        bcrypt.compare.mockResolvedValue(true);

        await expect(
          authService.login({
            email: "unit@teamforge.ai",
            password: "TeamForge123",
          }),
        ).rejects.toThrow("JWT_SECRET is not configured.");
      } finally {
        /*
         * Always restore shared process configuration so
         * subsequent tests remain deterministic.
         */
        process.env.JWT_SECRET = originalSecret;
      }
    });

    test("rejects an unknown email", async () => {
      userRepository.findByEmail.mockResolvedValue(undefined);

      await expect(
        authService.login({
          email: "unknown@teamforge.ai",
          password: "TeamForge123",
        }),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid email or password.",
      });

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test("rejects an incorrect password", async () => {
      userRepository.findByEmail.mockResolvedValue(storedUser);

      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.login({
          email: storedUser.email,
          password: "WrongPassword123",
        }),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid email or password.",
      });
    });
  });
});
