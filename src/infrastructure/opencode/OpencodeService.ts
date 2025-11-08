import { Context, Effect, Layer } from "effect";
import { OpencodeClient, Session } from "@opencode-ai/sdk";
import {
  SandboxExecutionRequest,
  SandboxExecutionResult,
} from "../../domain/sandbox/types.js";
import { AppConfigTag } from "../../config/Config.js";

export interface OpencodeServiceType {
  readonly executeCode: (
    _request: SandboxExecutionRequest,
  ) => Effect.Effect<SandboxExecutionResult, Error, never>;
  readonly createSession: () => Effect.Effect<string, Error, never>;
  readonly sendMessage: (
    _sessionId: string,
    _message: string,
  ) => Effect.Effect<string, Error, never>;
}

export const OpencodeService =
  Context.GenericTag<OpencodeServiceType>("OpencodeService");

const makeOpencodeService = Effect.gen(function* () {
  const config = yield* AppConfigTag;

  // Initialize opencode client
  const client = new OpencodeClient({});

  const createSession = Effect.tryPromise({
    try: async () => {
      // For now, return a mock session ID
      // TODO: Implement proper opencode API integration
      return `session_${Date.now()}`;
    },
    catch: (error) => new Error(`Failed to create opencode session: ${error}`),
  });

  const sendMessage = (_sessionId: string, message: string) =>
    Effect.tryPromise({
      try: async () => {
        // For now, return a mock response
        // TODO: Implement proper opencode API integration
        return `Mock response to: ${message}`;
      },
      catch: (error) =>
        new Error(`Failed to send message to opencode: ${error}`),
    });

  const executeCode = (request: SandboxExecutionRequest) =>
    Effect.gen(function* () {
      const startTime = Date.now();

      try {
        // Create new session or use existing one
        const sessionId = request.sessionId || (yield* createSession);

        // Send the prompt to opencode
        const output = yield* sendMessage(sessionId, request.prompt);

        const duration = Date.now() - startTime;

        const result: SandboxExecutionResult = {
          sessionId,
          sandboxId: request.sandboxId || `opencode_${sessionId}`,
          output,
          duration,
          success: true,
        };

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        return {
          sessionId: request.sessionId || "unknown",
          sandboxId: request.sandboxId || "unknown",
          output: "",
          duration,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        } as SandboxExecutionResult;
      }
    });

  return OpencodeService.of({
    createSession: () => createSession,
    sendMessage,
    executeCode,
  }) as OpencodeServiceType;
});

export const OpencodeServiceLive = Layer.effect(
  OpencodeService,
  makeOpencodeService,
);
