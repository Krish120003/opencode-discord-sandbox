import { describe, it, expect, vi } from "vitest";
import { Effect, Layer } from "effect";
import {
  SandboxService,
  SandboxServiceLive,
} from "../../src/application/services/SandboxService.js";
import { OpencodeService } from "../../src/infrastructure/opencode/OpencodeService.js";

// Mock OpencodeService
const mockOpencodeService = {
  executeCode: vi.fn(),
  createSession: vi.fn(),
  sendMessage: vi.fn(),
};

const MockOpencodeServiceLive = Layer.succeed(
  OpencodeService,
  mockOpencodeService as any,
);

describe("SandboxService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delegate to opencode service for code execution", async () => {
    const mockResult = {
      sessionId: "session-123",
      sandboxId: "sandbox-456",
      output: "Execution successful!",
      duration: 200,
      success: true,
    };

    mockOpencodeService.executeCode.mockResolvedValue(mockResult);

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const sandboxService = yield* SandboxService;
        return yield* sandboxService.executeCode({
          prompt: 'console.log("test")',
          sessionId: "session-123",
          sandboxId: "sandbox-456",
        });
      }).pipe(
        Effect.provide(SandboxServiceLive),
        Effect.provide(MockOpencodeServiceLive),
      ),
    );

    expect(result).toEqual(mockResult);
    expect(mockOpencodeService.executeCode).toHaveBeenCalledWith({
      prompt: 'console.log("test")',
      sessionId: "session-123",
      sandboxId: "sandbox-456",
    });
  });

  it("should handle execution errors", async () => {
    const mockError = new Error("Execution failed");
    mockOpencodeService.executeCode.mockRejectedValue(mockError);

    await expect(
      Effect.runPromise(
        Effect.gen(function* () {
          const sandboxService = yield* SandboxService;
          return yield* sandboxService.executeCode({
            prompt: "invalid code",
          });
        }).pipe(
          Effect.provide(SandboxServiceLive),
          Effect.provide(MockOpencodeServiceLive),
        ),
      ),
    ).rejects.toThrow("Execution failed");
  });
});
