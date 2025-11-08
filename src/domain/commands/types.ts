import { Schema } from '@effect/schema'

export interface Command {
  readonly name: string
  readonly description: string
  readonly args?: readonly CommandArg[]
}

export interface CommandArg {
  readonly name: string
  readonly description: string
  readonly required: boolean
  readonly type: 'string' | 'number' | 'boolean'
}

export interface CommandContext {
  readonly messageId: string
  readonly channelId: string
  readonly authorId: string
  readonly content: string
  readonly isThread: boolean
}

export interface CommandResult {
  readonly success: boolean
  readonly message?: string
  readonly embeds?: readonly unknown[]
  readonly error?: string
}

export const CommandSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  description: Schema.String.pipe(Schema.minLength(1)),
  args: Schema.optional(Schema.Array(Schema.Struct({
    name: Schema.String,
    description: Schema.String,
    required: Schema.Boolean,
    type: Schema.Literal('string', 'number', 'boolean')
  })))
})

export const CommandContextSchema = Schema.Struct({
  messageId: Schema.String,
  channelId: Schema.String,
  authorId: Schema.String,
  content: Schema.String,
  isThread: Schema.Boolean
})

export const CommandResultSchema = Schema.Struct({
  success: Schema.Boolean,
  message: Schema.optional(Schema.String),
  embeds: Schema.optional(Schema.Array(Schema.Unknown)),
  error: Schema.optional(Schema.String)
})

export type CommandCreate = Schema.Schema.Encoded<typeof CommandSchema>
export type CommandContextCreate = Schema.Schema.Encoded<typeof CommandContextSchema>
export type CommandResultCreate = Schema.Schema.Encoded<typeof CommandResultSchema>