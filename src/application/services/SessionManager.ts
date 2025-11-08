import { Context, Effect, Layer, Option, HashMap } from "effect";
import {
  Session,
  ThreadId,
  SessionId,
  SandboxId,
} from "../../domain/discord/types.js";
import { SandboxService } from "../services/SandboxService.js";

export interface SessionManagerType {
  readonly createSession: (_params: {
    threadId: ThreadId;
    prompt: string;
  }) => Effect.Effect<Session, Error, never>;
  readonly getSession: (
    _threadId: ThreadId,
  ) => Effect.Effect<Option<Session>, Error, never>;
  readonly continueSession: (_params: {
    threadId: ThreadId;
    prompt: string;
    sessionId: SessionId;
    sandboxId: SandboxId;
  }) => Effect.Effect<void, Error, never>;
  readonly cleanupExpiredSessions: Effect.Effect<void, Error, never>;
}

export const SessionManager =
  Context.GenericTag<SessionManagerType>("SessionManager");

interface SessionManagerState {
  readonly sessions: HashMap.HashMap<ThreadId, Session>;
}

const makeSessionManager = Effect.gen(function* () {
  const sandboxService = yield* SandboxService;

  const state: SessionManagerState = {
    sessions: HashMap.empty(),
  };

  const createSession = (_params: { threadId: ThreadId; prompt: string }) =>
    Effect.gen(function* () {
      const result = yield* sandboxService.executeCode({
        prompt: _params.prompt,
      });

      const session: Session = {
        threadId: _params.threadId,
        sessionId: result.sessionId,
        sandboxId: result.sandboxId,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      state.sessions = HashMap.set(state.sessions, _params.threadId, session);

      return session;
    });

  const getSession = (_threadId: ThreadId) =>
    Effect.succeed(HashMap.get(state.sessions, _threadId));

  const continueSession = (_params: {
    threadId: ThreadId;
    prompt: string;
    sessionId: SessionId;
    sandboxId: SandboxId;
  }) =>
    Effect.gen(function* () {
      yield* sandboxService.executeCode({
        prompt: _params.prompt,
        sessionId: _params.sessionId,
        sandboxId: _params.sandboxId,
      });

      // Update last activity
      const existingSession = HashMap.get(state.sessions, _params.threadId);
      if (Option.isSome(existingSession)) {
        const updatedSession: Session = {
          ...existingSession.value,
          lastActivity: new Date(),
        };
        state.sessions = HashMap.set(
          state.sessions,
          _params.threadId,
          updatedSession,
        );
      }
    });

  const cleanupExpiredSessions = Effect.sync(() => {
    const now = new Date();
    const expiredThreshold = 24 * 60 * 60 * 1000; // 24 hours

    state.sessions = HashMap.filter(
      state.sessions,
      (_, session) =>
        now.getTime() - session.lastActivity.getTime() < expiredThreshold,
    );
  });

  return SessionManager.of({
    createSession,
    getSession,
    continueSession,
    cleanupExpiredSessions,
  }) as SessionManagerType;
});

export const SessionManagerLive = Layer.effect(
  SessionManager,
  makeSessionManager,
);
