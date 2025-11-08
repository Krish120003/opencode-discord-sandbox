import { describe, it, expect, vi } from "vitest";
import { Effect, Layer } from "effect";
import { AppConfig, ConfigLive } from "../../src/config/Config.js";

// Mock environment variables
const mockEnv = {
  DISCORD_BOT_TOKEN: "test-token",
  DISCORD_CHANNEL_ID: "test-channel-id",
  SANDBOX_TIMEOUT: 300000,
  SANDBOX_MAX_MEMORY: 1024,
  SANDBOX_MAX_CPUS: 2,
};

describe("Config", () => {
  beforeEach(() => {
    vi.stubEnv("DISCORD_BOT_TOKEN", mockEnv.DISCORD_BOT_TOKEN);
    vi.stubEnv("DISCORD_CHANNEL_ID", mockEnv.DISCORD_CHANNEL_ID);
    vi.stubEnv("SANDBOX_TIMEOUT", mockEnv.SANDBOX_TIMEOUT.toString());
    vi.stubEnv("SANDBOX_MAX_MEMORY", mockEnv.SANDBOX_MAX_MEMORY.toString());
    vi.stubEnv("SANDBOX_MAX_CPUS", mockEnv.SANDBOX_MAX_CPUS.toString());
  });

  it("should load configuration from environment", async () => {
    const program = Effect.gen(function* () {
      const config = yield* AppConfig;
      return config;
    }).pipe(Effect.provide(ConfigLive));

    const config = await Effect.runPromise(program);

    expect(config.discord.token).toBe(mockEnv.DISCORD_BOT_TOKEN);
    expect(config.discord.channelId).toBe(mockEnv.DISCORD_CHANNEL_ID);
    expect(config.sandbox.timeout).toBe(mockEnv.SANDBOX_TIMEOUT);
    expect(config.sandbox.maxMemory).toBe(mockEnv.SANDBOX_MAX_MEMORY);
    expect(config.sandbox.maxCpus).toBe(mockEnv.SANDBOX_MAX_CPUS);
  });

  it("should use default values when optional env vars are missing", async () => {
    vi.stubEnv("SANDBOX_TIMEOUT", undefined);
    vi.stubEnv("SANDBOX_MAX_MEMORY", undefined);
    vi.stubEnv("SANDBOX_MAX_CPUS", undefined);

    const program = Effect.gen(function* () {
      const config = yield* AppConfig;
      return config;
    }).pipe(Effect.provide(ConfigLive));

    const config = await Effect.runPromise(program);

    expect(config.sandbox.timeout).toBe(300000); // 5 minutes default
    expect(config.sandbox.maxMemory).toBe(1024); // 1GB default
    expect(config.sandbox.maxCpus).toBe(2); // 2 CPUs default
  });

  it("should fail when required environment variables are missing", async () => {
    vi.stubEnv("DISCORD_BOT_TOKEN", undefined);

    const program = Effect.gen(function* () {
      const config = yield* AppConfig;
      return config;
    }).pipe(Effect.provide(ConfigLive));

    await expect(Effect.runPromise(program)).rejects.toThrow(
      "Missing Discord config",
    );
  });
});
