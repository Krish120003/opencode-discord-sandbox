import { Context, Effect, Layer } from 'effect'
import { SandboxExecutionRequest, SandboxExecutionResult } from '../../domain/sandbox/types.js'
import { Config } from '../../config/Config.js'

export interface SandboxService {
  readonly executeCode: (request: SandboxExecutionRequest) => Effect.Effect<SandboxExecutionResult, Error, never>
}

export const SandboxService = Context.GenericTag<SandboxService>('SandboxService')

const makeSandboxService = Effect.gen(function* () {
  const config = yield* Config

  const executeCode = (request: SandboxExecutionRequest) => Effect.gen(function* () {
    // This will be implemented with opencode integration
    // For now, return a mock result
    const mockResult: SandboxExecutionResult = {
      sessionId: request.sessionId || `session_${Date.now()}`,
      sandboxId: `sandbox_${Date.now()}`,
      output: `Executed: ${request.prompt}`,
      duration: 100,
      success: true
    }

    return mockResult
  })

  return SandboxService.of({
    executeCode
  })
})

export const SandboxServiceLive = Layer.effect(SandboxService, makeSandboxService)