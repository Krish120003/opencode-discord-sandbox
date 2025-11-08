import { Context, Effect, Layer } from 'effect'
import { SandboxExecutionRequest, SandboxExecutionResult } from '../../domain/sandbox/types.js'
import { OpencodeService } from '../../infrastructure/opencode/OpencodeService.js'

export interface SandboxService {
  readonly executeCode: (request: SandboxExecutionRequest) => Effect.Effect<SandboxExecutionResult, Error, never>
}

export const SandboxService = Context.GenericTag<SandboxService>('SandboxService')

const makeSandboxService = Effect.gen(function* () {
  const opencodeService = yield* OpencodeService

  const executeCode = (request: SandboxExecutionRequest) => Effect.gen(function* () {
    // Delegate to opencode service for actual execution
    const result = yield* opencodeService.executeCode(request)
    return result
  })

  return SandboxService.of({
    executeCode
  })
})

export const SandboxServiceLive = Layer.effect(SandboxService, makeSandboxService)