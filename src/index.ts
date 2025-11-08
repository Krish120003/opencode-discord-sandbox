import { Effect, Layer } from "effect";
import { NodeSdk } from "@effect/platform-node";
import { ConfigLive } from "./config/Config.js";
import { DiscordBotLive } from "./infrastructure/discord/DiscordBot.js";
import { SessionManagerLive } from "./application/services/SessionManager.js";
import { SandboxServiceLive } from "./application/services/SandboxService.js";
import { OpencodeServiceLive } from "./infrastructure/opencode/OpencodeService.js";
import { DiscordBot } from "./infrastructure/discord/DiscordBot.js";

const MainLive = Layer.mergeAll(
  ConfigLive,
  DiscordBotLive,
  SessionManagerLive,
  SandboxServiceLive,
  OpencodeServiceLive,
);

const program = Effect.gen(function* () {
  const discord = yield* DiscordBot;
  yield* discord.start();
});

const sdk = NodeSdk.layer(MainLive);

Effect.runPromise(
  program.pipe(Effect.provide(sdk), Effect.catchAllCause(Effect.logError)),
);
