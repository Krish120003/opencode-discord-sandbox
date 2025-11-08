import { Context, Effect, Layer, Option, HashMap } from 'effect'
import { Session, ThreadId, SessionId, SandboxId } from '../../domain/discord/types.js'
import { SandboxService } from '../services/SandboxService.js'

export interface SessionManager {
  readonly createSession: (params: { threadId: ThreadId; prompt: string }) => Effect.Effect<Session, Error, never>
  readonly getSession: (threadId: ThreadId) => Effect.Effect<Option<Session>, Error, never>
  readonly continueSession: (params: { 
    threadId: ThreadId
    prompt: string
    sessionId: SessionId
    sandboxId: SandboxId 
  }) => Effect.Effect<void, Error, never>
  readonly cleanupExpiredSessions: Effect.Effect<void, Error, never>
}

export const SessionManager = Context.GenericTag<SessionManager>('SessionManager')

interface SessionManagerState {
  readonly sessions: HashMap.HashMap<ThreadId, Session>
}

const makeSessionManager = Effect.gen(function* () {
  const sandboxService = yield* SandboxService
  
  const state: SessionManagerState = {
    sessions: HashMap.empty()
  }

  const createSession = (params: { threadId: ThreadId; prompt: string }) => Effect.gen(function* () {
    const result = yield* sandboxService.executeCode({
      prompt: params.prompt
    })

    const session: Session = {
      threadId: params.threadId,
      sessionId: result.sessionId,
      sandboxId: result.sandboxId,
      createdAt: new Date(),
      lastActivity: new Date()
    }

    state.sessions = HashMap.set(state.sessions, params.threadId, session)
    
    return session
  })

  const getSession = (threadId: ThreadId) => Effect.succeed(
    HashMap.get(state.sessions, threadId)
  )

  const continueSession = (params: { 
    threadId: ThreadId
    prompt: string
    sessionId: SessionId
    sandboxId: SandboxId 
  }) => Effect.gen(function* () {
    const result = yield* sandboxService.executeCode({
      prompt: params.prompt,
      sessionId: params.sessionId,
      sandboxId: params.sandboxId
    })

    // Update last activity
    const existingSession = HashMap.get(state.sessions, params.threadId)
    if (Option.isSome(existingSession)) {
      const updatedSession: Session = {
        ...existingSession.value,
        lastActivity: new Date()
      }
      state.sessions = HashMap.set(state.sessions, params.threadId, updatedSession)
    }
  })

  const cleanupExpiredSessions = Effect.gen(function* () {
    const now = new Date()
    const expiredThreshold = 24 * 60 * 60 * 1000 // 24 hours

    state.sessions = HashMap.filter(state.sessions, (_, session) => 
      now.getTime() - session.lastActivity.getTime() < expiredThreshold
    )
  })

  return SessionManager.of({
    createSession,
    getSession,
    continueSession,
    cleanupExpiredSessions
  })
})

export const SessionManagerLive = Layer.effect(SessionManager, makeSessionManager)