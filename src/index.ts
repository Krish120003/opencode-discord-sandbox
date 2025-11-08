import { Effect, Layer, Runtime } from 'effect'
import { NodeSdk } from '@effect/platform-node'
import { Config } from './config/Config.js'
import { DiscordBot } from './infrastructure/discord/DiscordBot.js'

const MainLive = Layer.mergeAll(
  Config.Live,
  DiscordBot.Live
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