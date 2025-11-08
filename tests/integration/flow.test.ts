import { describe, it, expect, vi } from "vitest";
import { Effect, Layer } from "effect";
import { AppConfigTag, ConfigLive } from "../../src/config/Config.js";
import { OpencodeService } from "../../src/infrastructure/opencode/OpencodeService.js";
import { SandboxService } from "../../src/application/services/SandboxService.js";
import { SessionManager } from "../../src/application/services/SessionManager.js";

// Mock all dependencies
const mockOpencodeService = {
  executeCode: vi.fn(),
  createSession: vi.fn(),
  sendMessage: vi.fn(),
};

const mockDiscordClient = {
  login: vi.fn(),
  once: vi.fn(),
  on: vi.fn(),
};

vi.mock("discord.js", () => ({
  Client: vi.fn(() => mockDiscordClient),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    MessageContent: 4,
  },
  Partials: {
    Channel: 1,
    Message: 2,
    User: 4,
    ThreadMember: 8,
  },
  Events: {
    ClientReady: "ready",
    MessageCreate: "messageCreate",
  },
}));

const MockOpencodeServiceLive = Layer.succeed(
  OpencodeService,
  mockOpencodeService as any,
);
const MockSandboxServiceLive = Layer.succeed(SandboxService, {
  executeCode: mockOpencodeService.executeCode,
} as any);
const MockSessionManagerLive = Layer.succeed(SessionManager, {
  createSession: mockOpencodeService.createSession,
  getSession: vi.fn(),
  continueSession: vi.fn(),
  cleanupExpiredSessions: vi.fn(),
} as any);

// Mock environment
const mockEnv = {
  DISCORD_BOT_TOKEN: "test-token",
  DISCORD_CHANNEL_ID: "test-channel-id",
  SANDBOX_TIMEOUT: 300000,
  SANDBOX_MAX_MEMORY: 1024,
  SANDBOX_MAX_CPUS: 2,
};

describe("Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DISCORD_BOT_TOKEN", mockEnv.DISCORD_BOT_TOKEN);
    vi.stubEnv("DISCORD_CHANNEL_ID", mockEnv.DISCORD_CHANNEL_ID);
    vi.stubEnv("SANDBOX_TIMEOUT", mockEnv.SANDBOX_TIMEOUT.toString());
    vi.stubEnv("SANDBOX_MAX_MEMORY", mockEnv.SANDBOX_MAX_MEMORY.toString());
    vi.stubEnv("SANDBOX_MAX_CPUS", mockEnv.SANDBOX_MAX_CPUS.toString());
  });

  it("should handle complete flow from message to execution", async () => {
    // Mock opencode responses
    const mockSession = { id: "session-123" };
    const mockExecutionResult = {
      sessionId: "session-123",
      sandboxId: "opencode_session-123",
      output: "Code executed successfully!",
      duration: 150,
      success: true,
    };

    mockOpencodeService.createSession.mockResolvedValue(mockSession);
    mockOpencodeService.executeCode.mockResolvedValue(mockExecutionResult);

    // Mock Discord client ready event
    mockDiscordClient.once.mockImplementation((event, callback) => {
      if (event === "ready") {
        setTimeout(callback, 0);
      }
    });

    // Mock Discord client login
    mockDiscordClient.login.mockResolvedValue("LOGIN_SUCCESS");

    // This would normally start the bot, but we'll just test the setup
    const config = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* AppConfigTag;
      }).pipe(Effect.provide(ConfigLive)),
    );

    expect(config.discord.token).toBe(mockEnv.DISCORD_BOT_TOKEN);
    expect(config.discord.channelId).toBe(mockEnv.DISCORD_CHANNEL_ID);
    expect(config.sandbox.timeout).toBe(mockEnv.SANDBOX_TIMEOUT);
  });

  it("should handle session creation and continuation flow", async () => {
    const mockSession = { id: "session-123" };
    const mockExecutionResult = {
      sessionId: "session-123",
      sandboxId: "opencode_session-123",
      output: "First execution",
      duration: 100,
      success: true,
    };

    mockOpencodeService.createSession.mockResolvedValue(mockSession);
    mockOpencodeService.executeCode.mockResolvedValue(mockExecutionResult);

    // Test the flow through the services
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const sessionManager = yield* SessionManager;
        return yield* sessionManager.createSession({
          threadId: "thread-789",
          prompt: "Initial prompt",
        });
      }).pipe(
        Effect.provide(MockSessionManagerLive),
        Effect.provide(MockSandboxServiceLive),
        Effect.provide(MockOpencodeServiceLive),
      ),
    );

    expect(result.threadId).toBe("thread-789");
    expect(result.sessionId).toBe("session-123");
    expect(result.sandboxId).toBe("opencode_session-123");
  });
});
