import { Context, Effect, Layer } from "effect";
import { Sandbox } from "@vercel/sandbox";
import {
  SandboxExecutionRequest,
  SandboxExecutionResult,
} from "../../domain/sandbox/types.js";
import { AppConfigTag, ConfigLive } from "../../config/Config.js";

export interface OpencodeServiceType {
  readonly executeCode: (
    _request: SandboxExecutionRequest,
  ) => Effect.Effect<SandboxExecutionResult, Error, never>;
  readonly createSession: Effect.Effect<string, Error, never>;
  readonly sendMessage: (
    _sessionId: string,
    _message: string,
  ) => Effect.Effect<string, Error, never>;
}

export const OpencodeService =
  Context.GenericTag<OpencodeServiceType>("OpencodeService");

// Store active sandboxes in memory (in production, use Redis/database)
export const activeSandboxes = new Map<string, Sandbox>();

const makeOpencodeService = Effect.gen(function* () {
  const config = yield* AppConfigTag;

  const createSession = Effect.tryPromise({
    try: async () => {
      // Check for Vercel credentials
      const token = process.env.VERCEL_OIDC_TOKEN;
      const projectId = process.env.VERCEL_PROJECT_ID || undefined;
      const teamId = process.env.VERCEL_TEAM_ID || undefined;
      
      if (!token) {
        throw new Error("VERCEL_OIDC_TOKEN environment variable is required for Vercel Sandboxes");
      }
      
      // Create a new Vercel Sandbox with credentials
      const credentials: any = { token };
      if (projectId) credentials.projectId = projectId;
      if (teamId) credentials.teamId = teamId;
      
      const sandbox = await Sandbox.create(credentials);

      const sessionId = `sandbox_${Date.now()}`;
      activeSandboxes.set(sessionId, sandbox);
      
      return sessionId;
    },
    catch: (error) => new Error(`Failed to create Vercel sandbox: ${error}`),
  });

  const sendMessage = (sessionId: string, message: string) =>
    Effect.tryPromise({
      try: async () => {
        const sandbox = activeSandboxes.get(sessionId);
        if (!sandbox) {
          throw new Error(`Sandbox ${sessionId} not found`);
        }

        // Execute the message as a command in the sandbox
        const result = await sandbox.runCommand("node", ["-e", message]);
        
        if (result.exitCode === 0) {
          try {
            return await result.stdout() || "Command executed successfully (no output)";
          } catch {
            return "Command executed successfully (no output)";
          }
        } else {
          try {
            return `Error: ${await result.stderr() || "Unknown error"}`;
          } catch {
            return "Unknown error";
          }
        }
      },
      catch: (error) =>
        new Error(`Failed to execute command in sandbox: ${error}`),
    });

  const executeCode = (request: SandboxExecutionRequest) =>
    Effect.gen(function* () {
      const startTime = Date.now();

      try {
        // Create new session or use existing one
        const sessionId = request.sessionId || (yield* createSession);

        // Execute the code in the sandbox
        const output = yield* sendMessage(sessionId, request.prompt);

        const duration = Date.now() - startTime;

        const result: SandboxExecutionResult = {
          sessionId,
          sandboxId: request.sandboxId || `vercel_${sessionId}`,
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
    createSession,
    sendMessage,
    executeCode,
  }) as OpencodeServiceType;
});

export const OpencodeServiceLive = Layer.effect(
  OpencodeService,
  makeOpencodeService,
);
