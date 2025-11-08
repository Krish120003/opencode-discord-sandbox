import { Context, Effect, Layer, Option } from "effect";
import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import { AppConfigTag } from "../../config/Config.js";
import { DiscordMessage } from "../../domain/discord/types.js";
import { SessionManager } from "../../application/services/SessionManager.js";

export interface DiscordBotType {
  readonly start: Effect.Effect<void, any, any>;
  readonly createThread: (
    _messageId: string,
    _name: string,
  ) => Effect.Effect<string, any, any>;
  readonly sendMessage: (
    _channelId: string,
    _content: string,
  ) => Effect.Effect<void, any, any>;
}

export const DiscordBot = Context.GenericTag<DiscordBotType>("DiscordBot");

export const DiscordBotLive = Layer.effect(
  DiscordBot,
  Effect.gen(function* () {
    const config = yield* AppConfigTag;

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.ThreadMember,
      ],
    });

    const start = Effect.gen(function* () {
      yield* Effect.async<void, never>((resume) => {
        client.once(Events.ClientReady, () => {
          // eslint-disable-next-line no-undef
          console.log(`Discord bot logged in as ${client.user?.tag}`);
          resume(Effect.void);
        });
      });

      client.on(Events.MessageCreate, (message) => {
        if (message.author?.bot) return;

        const discordMessage: DiscordMessage = {
          id: message.id,
          content: message.content || "",
          authorId: message.author.id,
          channelId: message.channelId,
          isThread: message.channel.isThread?.() ?? false,
          parentChannelId: message.channel.isThread?.()
            ? message.channel.parentId ?? undefined
            : undefined,
        };

        Effect.runPromise(
          (handleMessage(discordMessage) as any).pipe(
            Effect.catchAllCause(Effect.logError),
          ),
        );
      });

      yield* Effect.tryPromise({
        try: () => client.login(config.discord.token),
        catch: (error) => new Error(`Failed to login to Discord: ${error}`),
      });
    });

    const handleMessage = (message: DiscordMessage) =>
      Effect.gen(function* () {
        const sessionManager = yield* SessionManager;

        // New message in the configured channel => create a thread + start a session
        if (
          message.channelId === config.discord.channelId &&
          !message.isThread
        ) {
          const threadName =
            message.content.replace(/\s+/g, " ").trim().slice(0, 80) ||
            "Opencode Session";

          const threadId = yield* createThreadFromMessage(
            message.id,
            threadName,
          );

          yield* sendMessage(message.channelId, "Starting opencode session...");

          yield* sessionManager.createSession({
            threadId,
            prompt: message.content,
          });

          return;
        }

        // Message inside a thread that has a session => continue that session
        if (message.isThread) {
          const existingSession = yield* sessionManager.getSession(
            message.channelId,
          );

          if (Option.isSome(existingSession)) {
            yield* sendMessage(message.channelId, "Thinking...");

            if (Option.isSome(existingSession)) {
              yield* sessionManager.continueSession({
                threadId: message.channelId,
                prompt: message.content,
                sessionId: existingSession.value.sessionId,
                sandboxId: existingSession.value.sandboxId,
              });
            }
          }
        }
      });

    const createThreadFromMessage = (messageId: string, name: string) =>
      Effect.gen(function* () {
        const channel = yield* Effect.tryPromise({
          try: () => client.channels.fetch(messageId),
          catch: (error) => new Error(`Failed to fetch channel: ${error}`),
        });

        if (!channel || !("messages" in channel)) {
          return yield* Effect.fail(new Error("Channel not found or cannot fetch messages"));
        }

        const message = yield* Effect.tryPromise({
          try: () => channel.messages.fetch(messageId),
          catch: (error) => new Error(`Failed to fetch message: ${error}`),
        });

        if (!message) {
          return yield* Effect.fail(new Error("Message not found"));
        }

        const thread = yield* Effect.tryPromise({
          try: () =>
            message.startThread({
              name,
              autoArchiveDuration: 1440, // 24 hours
              reason: "Start opencode session",
            }),
          catch: (error) => new Error(`Failed to create thread: ${error}`),
        });

        return thread.id;
      });

    const createThread = (messageId: string, name: string) =>
      createThreadFromMessage(messageId, name);

    const sendMessage = (channelId: string, content: string) =>
      Effect.gen(function* () {
        const channel = yield* Effect.tryPromise({
          try: () => client.channels.fetch(channelId),
          catch: (error) => new Error(`Failed to fetch channel: ${error}`),
        });

        if (!channel || !("send" in channel)) {
          return yield* Effect.fail(
            new Error("Channel not found or cannot send messages"),
          );
        }

        yield* Effect.tryPromise({
          try: () => Promise.resolve(channel.send(content)),
          catch: (error) => new Error(`Failed to send message: ${error}`),
        });
      });

    return DiscordBot.of({
      start,
      createThread,
      sendMessage,
    }) as DiscordBotType;
  }),
);
