import { Schema } from "effect";

export const ThreadIdSchema = Schema.String.pipe(Schema.minLength(1));
export const SessionIdSchema = Schema.String.pipe(Schema.minLength(1));
export const SandboxIdSchema = Schema.String.pipe(Schema.minLength(1));

export type ThreadId = typeof ThreadIdSchema.Type;
export type SessionId = typeof SessionIdSchema.Type;
export type SandboxId = typeof SandboxIdSchema.Type;

export interface Session {
  readonly threadId: ThreadId;
  readonly sessionId: SessionId;
  readonly sandboxId: SandboxId;
  readonly createdAt: Date;
  readonly lastActivity: Date;
}

export const SessionSchema = Schema.Struct({
  threadId: ThreadIdSchema,
  sessionId: SessionIdSchema,
  sandboxId: SandboxIdSchema,
  createdAt: Schema.Date,
  lastActivity: Schema.Date,
});

export type SessionCreate = Schema.Schema.Encoded<typeof SessionSchema>;

export interface DiscordMessage {
  readonly id: string;
  readonly content: string;
  readonly authorId: string;
  readonly channelId: string;
  readonly isThread: boolean;
  readonly parentChannelId?: string;
}

export const DiscordMessageSchema = Schema.Struct({
  id: Schema.String,
  content: Schema.String,
  authorId: Schema.String,
  channelId: Schema.String,
  isThread: Schema.Boolean,
  parentChannelId: Schema.optional(Schema.String),
});

export type DiscordMessageCreate = Schema.Schema.Encoded<
  typeof DiscordMessageSchema
>;
