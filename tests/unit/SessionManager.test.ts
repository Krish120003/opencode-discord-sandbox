import { describe, it, expect, vi } from 'vitest'
import { Effect, Layer } from 'effect'
import { SessionManager, SessionManagerLive } from '../../src/application/services/SessionManager.js'
import { SandboxService } from '../../src/application/services/SandboxService.js'

// Mock SandboxService
const mockSandboxService = {
  executeCode: vi.fn()
}

const MockSandboxServiceLive = Layer.succeed(SandboxService, mockSandboxService as any)

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new session', async () => {
    const mockResult = {
      sessionId: 'session-123',
      sandboxId: 'sandbox-456',
      output: 'Hello, world!',
      duration: 100,
      success: true
    }
    
    mockSandboxService.executeCode.mockResolvedValue(mockResult)

    const sessionManager = Effect.runSync(
      Effect.service(SessionManager).pipe(
        Effect.provide(SessionManagerLive),
        Effect.provide(MockSandboxServiceLive)
      )
    )

    const result = await Effect.runPromise(
      sessionManager.createSession({
        threadId: 'thread-789',
        prompt: 'Hello, world!'
      })
    )

    expect(result.threadId).toBe('thread-789')
    expect(result.sessionId).toBe('session-123')
    expect(result.sandboxId).toBe('sandbox-456')
    expect(result.createdAt).toBeInstanceOf(Date)
    expect(result.lastActivity).toBeInstanceOf(Date)
    expect(mockSandboxService.executeCode).toHaveBeenCalledWith({
      prompt: 'Hello, world!'
    })
  })

  it('should continue an existing session', async () => {
    const mockResult = {
      sessionId: 'session-123',
      sandboxId: 'sandbox-456',
      output: 'Response to continuation',
      duration: 150,
      success: true
    }
    
    mockSandboxService.executeCode.mockResolvedValue(mockResult)

    const sessionManager = Effect.runSync(
      Effect.service(SessionManager).pipe(
        Effect.provide(SessionManagerLive),
        Effect.provide(MockSandboxServiceLive)
      )
    )

    // First create a session
    await sessionManager.createSession({
      threadId: 'thread-789',
      prompt: 'Initial message'
    })

    // Then continue it
    await sessionManager.continueSession({
      threadId: 'thread-789',
      prompt: 'Continue conversation',
      sessionId: 'session-123',
      sandboxId: 'sandbox-456'
    })

    expect(mockSandboxService.executeCode).toHaveBeenCalledWith({
      prompt: 'Continue conversation',
      sessionId: 'session-123',
      sandboxId: 'sandbox-456'
    })
  })

  it('should return none for non-existent session', async () => {
    const sessionManager = Effect.runSync(
      Effect.service(SessionManager).pipe(
        Effect.provide(SessionManagerLive),
        Effect.provide(MockSandboxServiceLive)
      )
    )

    const result = await Effect.runPromise(
      sessionManager.getSession('non-existent-thread')
    )

    expect(result._tag).toBe('None')
  })

  it('should return existing session', async () => {
    const mockResult = {
      sessionId: 'session-123',
      sandboxId: 'sandbox-456',
      output: 'Hello, world!',
      duration: 100,
      success: true
    }
    
    mockSandboxService.executeCode.mockResolvedValue(mockResult)

    const sessionManager = Effect.runSync(
      Effect.service(SessionManager).pipe(
        Effect.provide(SessionManagerLive),
        Effect.provide(MockSandboxServiceLive)
      )
    )

    // Create a session
    await sessionManager.createSession({
      threadId: 'thread-789',
      prompt: 'Hello, world!'
    })

    // Retrieve it
    const result = await Effect.runPromise(
      sessionManager.getSession('thread-789')
    )

    expect(result._tag).toBe('Some')
    if (result._tag === 'Some') {
      expect(result.value.threadId).toBe('thread-789')
      expect(result.value.sessionId).toBe('session-123')
      expect(result.value.sandboxId).toBe('sandbox-456')
    }
  })
})