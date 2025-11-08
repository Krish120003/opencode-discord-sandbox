import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Layer } from "effect";
import {
  OpencodeService,
  OpencodeServiceLive,
  activeSandboxes,
} from "../../src/infrastructure/opencode/OpencodeService.js";
import { AppConfigTag } from "../../src/config/Config.js";

// Mock Vercel Sandbox
const mockSandbox = {
  runCommand: vi.fn(),
};

const mockSandboxCreate = vi.fn();

vi.mock("@vercel/sandbox", () => ({
  Sandbox: {
    create: vi.fn(),
  },
}));

// Mock AppConfig
const mockConfig = {
  discord: {
    token: "test-token",
    channelId: "test-channel",
  },
  sandbox: {
    timeout: 300000,
    maxMemory: 1024,
    maxCpus: 2,
  },
};

const MockAppConfigLive = Layer.succeed(AppConfigTag, mockConfig);

describe("OpencodeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the in-memory sandboxes map
    activeSandboxes.clear();
    // Setup mock environment
    vi.stubEnv("VERCEL_OIDC_TOKEN", "test-token");
    // Setup mock
    const { Sandbox } = require("@vercel/sandbox");
    Sandbox.create = mockSandboxCreate;
  });

  it("should create a new session", async () => {
    const sessionId = await Effect.runPromise(
      Effect.gen(function* () {
        const opencodeService = yield* OpencodeService;
        return yield* opencodeService.createSession();
      }).pipe(
        Effect.provide(OpencodeServiceLive),
        Effect.provide(MockAppConfigLive),
      ),
    );

    expect(sessionId).toMatch(/^sandbox_\d+$/);
    expect(mockSandboxCreate).toHaveBeenCalledWith({
      token: undefined,
    });
  });

  it("should send message to existing session", async () => {
    // Setup a mock sandbox
    const mockResult = {
      exitCode: 0,
      stdout: vi.fn().mockResolvedValue("Hello from Vercel Sandbox!"),
      stderr: vi.fn().mockResolvedValue(""),
    };
    mockSandbox.runCommand.mockResolvedValue(mockResult);
    mockSandboxCreate.mockResolvedValue(mockSandbox);

    // First create a session
    const sessionId = await Effect.runPromise(
      Effect.gen(function* () {
        const opencodeService = yield* OpencodeService;
        return yield* opencodeService.createSession();
      }).pipe(
        Effect.provide(OpencodeServiceLive),
        Effect.provide(MockAppConfigLive),
      ),
    );

    // Then send a message to that session
    const response = await Effect.runPromise(
      Effect.gen(function* () {
        const opencodeService = yield* OpencodeService;
        return yield* opencodeService.sendMessage(sessionId, "console.log('Hello!')");
      }).pipe(
        Effect.provide(OpencodeServiceLive),
        Effect.provide(MockAppConfigLive),
      ),
    );

    expect(response).toBe("Hello from Vercel Sandbox!");
    expect(mockSandbox.runCommand).toHaveBeenCalledWith("node", ["-e", "console.log('Hello!')"]);
  });

  it("should execute code with new session", async () => {
    // Setup a mock sandbox
    const mockResult = {
      exitCode: 0,
      stdout: vi.fn().mockResolvedValue("Hello, world!"),
      stderr: vi.fn().mockResolvedValue(""),
    };
    mockSandbox.runCommand.mockResolvedValue(mockResult);
    mockSandboxCreate.mockResolvedValue(mockSandbox);

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const opencodeService = yield* OpencodeService;
        return yield* opencodeService.executeCode({
          prompt: 'console.log("Hello, world!")',
        });
      }).pipe(
        Effect.provide(OpencodeServiceLive),
        Effect.provide(MockAppConfigLive),
      ),
    );

    expect(result.sessionId).toMatch(/^sandbox_\d+$/);
    expect(result.sandboxId).toMatch(/^vercel_sandbox_\d+$/);
    expect(result.output).toBe("Hello, world!");
    expect(result.success).toBe(true);
    expect(result.duration).toBeGreaterThan(0);
    expect(mockSandboxCreate).toHaveBeenCalledOnce();
    expect(mockSandbox.runCommand).toHaveBeenCalledWith("node", ["-e", 'console.log("Hello, world!")']);
  });

  it("should execute code with existing session", async () => {
    // Setup a mock sandbox
    const mockResult = {
      exitCode: 0,
      stdout: vi.fn().mockResolvedValue("Continued!"),
      stderr: vi.fn().mockResolvedValue(""),
    };
    mockSandbox.runCommand.mockResolvedValue(mockResult);
    mockSandboxCreate.mockResolvedValue(mockSandbox);

    // First create a session to add it to the map
    const sessionId = await Effect.runPromise(
      Effect.gen(function* () {
        const opencodeService = yield* OpencodeService;
        return yield* opencodeService.createSession();
      }).pipe(
        Effect.provide(OpencodeServiceLive),
        Effect.provide(MockAppConfigLive),
      ),
    );

    // Clear the mock to test only the execution part
    mockSandboxCreate.mockClear();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const opencodeService = yield* OpencodeService;
        return yield* opencodeService.executeCode({
          prompt: 'console.log("Continued!")',
          sessionId,
          sandboxId: "existing-sandbox",
        });
      }).pipe(
        Effect.provide(OpencodeServiceLive),
        Effect.provide(MockAppConfigLive),
      ),
    );

    expect(result.sessionId).toBe(sessionId);
    expect(result.sandboxId).toBe("existing-sandbox");
    expect(result.output).toBe("Continued!");
    expect(result.success).toBe(true);
    expect(mockSandboxCreate).not.toHaveBeenCalled();
    expect(mockSandbox.runCommand).toHaveBeenCalledWith("node", ["-e", 'console.log("Continued!")']);
  });

  it("should handle errors gracefully", async () => {
    const error = new Error("Vercel Sandbox Error");
    mockSandboxCreate.mockRejectedValue(error);

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const opencodeService = yield* OpencodeService;
        return yield* opencodeService.executeCode({
          prompt: 'console.log("test")',
        });
      }).pipe(
        Effect.provide(OpencodeServiceLive),
        Effect.provide(MockAppConfigLive),
      ),
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Failed to create Vercel sandbox: Error: Vercel Sandbox Error",
    );
    expect(result.output).toBe("");
  });
});
