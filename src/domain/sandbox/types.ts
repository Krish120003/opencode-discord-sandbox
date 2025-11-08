import { Schema } from '@effect/schema'

export interface SandboxExecutionRequest {
  readonly prompt: string
  readonly sessionId?: string
  readonly sandboxId?: string
}

export interface SandboxExecutionResult {
  readonly sessionId: string
  readonly sandboxId: string
  readonly output: string
  readonly duration: number
  readonly success: boolean
  readonly error?: string
}

export interface SandboxMessage {
  readonly type: 'system' | 'assistant' | 'user' | 'result'
  readonly sessionId: string
  readonly content: unknown
}

export const SandboxExecutionRequestSchema = Schema.Struct({
  prompt: Schema.String.pipe(Schema.minLength(1)),
  sessionId: Schema.optional(Schema.String),
  sandboxId: Schema.optional(Schema.String)
})

export const SandboxExecutionResultSchema = Schema.Struct({
  sessionId: Schema.String,
  sandboxId: Schema.String,
  output: Schema.String,
  duration: Schema.Number.pipe(Schema.positive()),
  success: Schema.Boolean,
  error: Schema.optional(Schema.String)
})

export const SandboxMessageSchema = Schema.Struct({
  type: Schema.Literal('system', 'assistant', 'user', 'result'),
  sessionId: Schema.String,
  content: Schema.Unknown
})

export type SandboxExecutionRequestCreate = Schema.Schema.Encoded<typeof SandboxExecutionRequestSchema>
export type SandboxExecutionResultCreate = Schema.Schema.Encoded<typeof SandboxExecutionResultSchema>
export type SandboxMessageCreate = Schema.Schema.Encoded<typeof SandboxMessageSchema>