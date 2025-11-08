import { Effect, Layer } from 'effect'
import { NodeSdk } from '@effect/platform-node'
import { AppConfig, ConfigLive } from './config/Config.js'

const MainLive = Layer.mergeAll(
  ConfigLive,
  DiscordBotLive,
  SessionManagerLive,
  SandboxServiceLive,
  OpencodeServiceLive
)

const program = Effect.gen(function* () {
  const discord = yield* DiscordBot
  yield* discord.start()
})

const sdk = NodeSdk.layer(MainLive)

Effect.runPromise(
  program.pipe(
    Effect.provide(sdk),
    Effect.catchAllCause(Effect.logError)
  )
)