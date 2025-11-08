import { describe, it, expect, vi } from 'vitest'
import { Effect, Layer } from 'effect'
import { OpencodeService, OpencodeServiceLive } from '../../src/infrastructure/opencode/OpencodeService.js'
import { AppConfig } from '../../src/config/Config.js'

// Mock Opencode SDK
const mockOpencodeClient = {
  session: {
    create: vi.fn(),
    chat: vi.fn()
  }
}

vi.mock('@opencode-ai/sdk', () => ({
  default: vi.fn(() => mockOpencodeClient)
}))

// Mock AppConfig
const mockConfig = {
  discord: {
    token: 'test-token',
    channelId: 'test-channel'
  },
  sandbox: {
    timeout: 300000,
    maxMemory: 1024,
    maxCpus: 2
  }
}

const MockAppConfigLive = Layer.succeed(AppConfig, mockConfig)

describe('OpencodeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new session', async () => {
    const mockSession = { id: 'session-123' }
    mockOpencodeClient.session.create.mockResolvedValue(mockSession)

    const opencodeService = Effect.runSync(
      Effect.service(OpencodeService).pipe(
        Effect.provide(OpencodeServiceLive),
        Effect.provide(MockAppConfigLive)
      )
    )

    const sessionId = await Effect.runPromise(opencodeService.createSession())

    expect(sessionId).toBe('session-123')
    expect(mockOpencodeClient.session.create).toHaveBeenCalledOnce()
  })

  it('should send message to existing session', async () => {
    const mockResponse = {
      content: 'Hello from opencode!'
    }
    mockOpencodeClient.session.chat.mockResolvedValue(mockResponse)

    const opencodeService = Effect.runSync(
      Effect.service(OpencodeService).pipe(
        Effect.provide(OpencodeServiceLive),
        Effect.provide(MockAppConfigLive)
      )
    )

    const response = await Effect.runPromise(
      opencodeService.sendMessage('session-123', 'Hello opencode!')
    )

    expect(response).toBe('Hello from opencode!')
    expect(mockOpencodeClient.session.chat).toHaveBeenCalledWith('session-123', {
      message: 'Hello opencode!'
    })
  })

  it('should execute code with new session', async () => {
    const mockSession = { id: 'session-123' }
    const mockResponse = {
      content: 'Code executed successfully!'
    }
    
    mockOpencodeClient.session.create.mockResolvedValue(mockSession)
    mockOpencodeClient.session.chat.mockResolvedValue(mockResponse)

    const opencodeService = Effect.runSync(
      Effect.service(OpencodeService).pipe(
        Effect.provide(OpencodeServiceLive),
        Effect.provide(MockAppConfigLive)
      )
    )

    const result = await Effect.runPromise(
      opencodeService.executeCode({
        prompt: 'console.log("Hello, world!")'
      })
    )

    expect(result.sessionId).toBe('session-123')
    expect(result.sandboxId).toBe('opencode_session-123')
    expect(result.output).toBe('Code executed successfully!')
    expect(result.success).toBe(true)
    expect(result.duration).toBeGreaterThan(0)
    expect(mockOpencodeClient.session.create).toHaveBeenCalledOnce()
    expect(mockOpencodeClient.session.chat).toHaveBeenCalledWith('session-123', {
      message: 'console.log("Hello, world!")'
    })
  })

  it('should execute code with existing session', async () => {
    const mockResponse = {
      content: 'Continued execution successful!'
    }
    
    mockOpencodeClient.session.chat.mockResolvedValue(mockResponse)

    const opencodeService = Effect.runSync(
      Effect.service(OpencodeService).pipe(
        Effect.provide(OpencodeServiceLive),
        Effect.provide(MockAppConfigLive)
      )
    )

    const result = await Effect.runPromise(
      opencodeService.executeCode({
        prompt: 'console.log("Continued!")',
        sessionId: 'existing-session',
        sandboxId: 'existing-sandbox'
      })
    )

    expect(result.sessionId).toBe('existing-session')
    expect(result.sandboxId).toBe('existing-sandbox')
    expect(result.output).toBe('Continued execution successful!')
    expect(result.success).toBe(true)
    expect(mockOpencodeClient.session.create).not.toHaveBeenCalled()
    expect(mockOpencodeClient.session.chat).toHaveBeenCalledWith('existing-session', {
      message: 'console.log("Continued!")'
    })
  })

  it('should handle errors gracefully', async () => {
    const error = new Error('API Error')
    mockOpencodeClient.session.create.mockRejectedValue(error)

    const opencodeService = Effect.runSync(
      Effect.service(OpencodeService).pipe(
        Effect.provide(OpencodeServiceLive),
        Effect.provide(MockAppConfigLive)
      )
    )

    const result = await Effect.runPromise(
      opencodeService.executeCode({
        prompt: 'console.log("test")'
      })
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to create opencode session: Error: API Error')
    expect(result.output).toBe('')
  })
})