import { Config as EffectConfig, Context, Layer, Effect, Data } from 'effect'
import { Schema } from '@effect/schema'

export class ConfigError extends Data.TaggedError('ConfigError')<{
  readonly message: string
}> {}

export interface DiscordConfig {
  readonly token: string
  readonly channelId: string
}

export interface SandboxConfig {
  readonly timeout: number
  readonly maxMemory: number
  readonly maxCpus: number
}

export interface AppConfig {
  readonly discord: DiscordConfig
  readonly sandbox: SandboxConfig
}

export const AppConfig = Context.GenericTag<AppConfig>('AppConfig')

const DiscordConfigSchema = Schema.Struct({
  token: Schema.String.pipe(Schema.minLength(1)),
  channelId: Schema.String.pipe(Schema.minLength(1))
})

const SandboxConfigSchema = Schema.Struct({
  timeout: Schema.Number.pipe(Schema.positive()),
  maxMemory: Schema.Number.pipe(Schema.positive()),
  maxCpus: Schema.Number.pipe(Schema.positive())
})

const AppConfigSchema = Schema.Struct({
  discord: DiscordConfigSchema,
  sandbox: SandboxConfigSchema
})

export const ConfigLive = Layer.effect(
  AppConfig,
  Effect.gen(function* () {
    const discord = yield* Effect.all({
      token: EffectConfig.string('DISCORD_BOT_TOKEN'),
      channelId: EffectConfig.string('DISCORD_CHANNEL_ID')
    }).pipe(Effect.mapError(
      (error) => new ConfigError({ message: `Missing Discord config: ${error}` })
    ))

    const sandbox = yield* Effect.all({
      timeout: EffectConfig.number('SANDBOX_TIMEOUT').pipe(Effect.orElseSucceed(() => 300000)), // 5 minutes default
      maxMemory: EffectConfig.number('SANDBOX_MAX_MEMORY').pipe(Effect.orElseSucceed(() => 1024)), // 1GB default
      maxCpus: EffectConfig.number('SANDBOX_MAX_CPUS').pipe(Effect.orElseSucceed(() => 2)) // 2 CPUs default
    }).pipe(Effect.mapError(
      (error) => new ConfigError({ message: `Missing Sandbox config: ${error}` })
    ))

    const config = { discord, sandbox }
    
    // Validate with schema
    yield* Schema.decode(AppConfigSchema)(config).pipe(
      Effect.mapError(
        (error) => new ConfigError({ message: `Config validation failed: ${error}` })
      )
    )

    return config
  })
)