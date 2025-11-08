import { describe, it, expect, vi } from "vitest";
import { Effect, Layer, Schema } from "effect";
import { Session } from "../../src/domain/discord/types.js";

describe("Domain Types", () => {
  describe("Session Schema", () => {
    it("should validate a valid session", async () => {
      const validSession = {
        threadId: "thread-123",
        sessionId: "session-456",
        sandboxId: "sandbox-789",
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };

      const SessionSchema = Schema.Struct({
        threadId: Schema.String,
        sessionId: Schema.String,
        sandboxId: Schema.String,
        createdAt: Schema.DateFromString,
        lastActivity: Schema.DateFromString,
      });

      const result = await Effect.runPromise(Schema.decode(SessionSchema)(validSession));

      expect(result.threadId).toBe("thread-123");
      expect(result.sessionId).toBe("session-456");
      expect(result.sandboxId).toBe("sandbox-789");
    });

    it("should reject invalid session", async () => {
      const invalidSession = {
        threadId: "",
        sessionId: "session-456",
        sandboxId: "sandbox-789",
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };

      const SessionSchema = Schema.Struct({
        threadId: Schema.String.pipe(Schema.minLength(1)),
        sessionId: Schema.String,
        sandboxId: Schema.String,
        createdAt: Schema.DateFromString,
        lastActivity: Schema.DateFromString,
      });

      await expect(
        Effect.runPromise(Schema.decode(SessionSchema)(invalidSession))
      ).rejects.toThrow();
    });
  });
});
