import { Effect, Layer } from "effect";
import { NodeRuntime } from "@effect/platform-node";
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
  const startEffect = discord.start;
  return yield* startEffect;
});

const main = program.pipe(
  Effect.provide(MainLive),
  Effect.catchAllCause(Effect.logError),
);

Effect.runPromise(main as any);
