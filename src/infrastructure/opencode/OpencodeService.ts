import { Context, Effect, Layer } from 'effect'
import Opencode from '@opencode-ai/sdk'
import { SandboxExecutionRequest, SandboxExecutionResult } from '../../domain/sandbox/types.js'
import { AppConfig } from '../../config/Config.js'

export interface OpencodeService {
  readonly executeCode: (request: SandboxExecutionRequest) => Effect.Effect<SandboxExecutionResult, Error, never>
  readonly createSession: () => Effect.Effect<string, Error, never>
  readonly sendMessage: (sessionId: string, message: string) => Effect.Effect<string, Error, never>
}

export const OpencodeService = Context.GenericTag<OpencodeService>('OpencodeService')

const makeOpencodeService = Effect.gen(function* () {
  const config = yield* AppConfig
  
  // Initialize opencode client
  const client = new Opencode({
    logLevel: 'info',
    timeout: config.sandbox.timeout
  })

  const createSession = Effect.tryPromise({
    try: async () => {
      const session = await client.session.create()
      return session.id
    },
    catch: (error) => new Error(`Failed to create opencode session: ${error}`)
  })

  const sendMessage = (sessionId: string, message: string) => Effect.tryPromise({
    try: async () => {
      const response = await client.session.chat(sessionId, {
        message
      })
      return response.content
    },
    catch: (error) => new Error(`Failed to send message to opencode: ${error}`)
  })

  const executeCode = (request: SandboxExecutionRequest) => Effect.gen(function* () {
    const startTime = Date.now()
    
    try {
      // Create new session or use existing one
      const sessionId = request.sessionId || (yield* createSession)
      
      // Send the prompt to opencode
      const output = yield* sendMessage(sessionId, request.prompt)
      
      const duration = Date.now() - startTime
      
      const result: SandboxExecutionResult = {
        sessionId,
        sandboxId: request.sandboxId || `opencode_${sessionId}`,
        output,
        duration,
        success: true
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      return {
        sessionId: request.sessionId || 'unknown',
        sandboxId: request.sandboxId || 'unknown',
        output: '',
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      } as SandboxExecutionResult
    }
  })

  return OpencodeService.of({
    createSession,
    sendMessage,
    executeCode
  })
})

export const OpencodeServiceLive = Layer.effect(OpencodeService, makeOpencodeService)