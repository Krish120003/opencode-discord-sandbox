import { config } from "dotenv";
import { Effect, Layer } from "effect";
import { ConfigLive } from "./config/Config.js";
import { DiscordBotLive } from "./infrastructure/discord/DiscordBot.js";
import { SessionManagerLive } from "./application/services/SessionManager.js";
import { SandboxServiceLive } from "./application/services/SandboxService.js";
import { OpencodeServiceLive } from "./infrastructure/opencode/OpencodeService.js";
import { DiscordBot } from "./infrastructure/discord/DiscordBot.js";

// Load environment variables from .env file
config();

// Build dependency chain properly - DiscordBot needs both Config and SessionManager
const withDependencies = SessionManagerLive.pipe(
  Layer.provide(SandboxServiceLive),
  Layer.provide(OpencodeServiceLive), 
  Layer.provide(ConfigLive),
);

const MainLive = Layer.mergeAll(
  ConfigLive,
  withDependencies,
  DiscordBotLive.pipe(Layer.provide(ConfigLive)).pipe(Layer.provide(withDependencies)),
);

const program = Effect.gen(function* () {
  const discord = yield* DiscordBot;
  return yield* discord.start;
});

const main = program.pipe(
  Effect.provide(MainLive),
  Effect.catchAllCause(Effect.logError),
);

Effect.runPromise(main);
