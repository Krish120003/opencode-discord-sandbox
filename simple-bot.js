import { config } from "dotenv";
import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import { Sandbox } from "@vercel/sandbox";

// Load environment variables from both .env and .env.local files
config({ path: '.env' });
config({ path: '.env.local' });

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

if (!DISCORD_BOT_TOKEN) {
  console.error("Missing DISCORD_BOT_TOKEN in environment");
  process.exit(1);
}

if (!DISCORD_CHANNEL_ID) {
  console.error("Missing DISCORD_CHANNEL_ID in environment");
  process.exit(1);
}

// Store active sandboxes in memory
const activeSandboxes = new Map();

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

client.once(Events.ClientReady, async () => {
  console.log(`Discord bot logged in as ${client.user?.tag}`);
  
  // Send status message to configured channel
  try {
    const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
    if (channel && channel.send) {
      await channel.send("🤖 **Opencode Bot is now online!** Ready to execute code in Vercel Sandboxes. 🚀");
      console.log("Status message sent to channel");
    } else {
      console.log("Could not find the configured channel to send status message");
    }
  } catch (error) {
    console.error("Failed to send status message:", error.message);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author?.bot) return;

  // New message in configured channel => create a thread + start a session
  if (
    message.channelId === DISCORD_CHANNEL_ID &&
    !message.channel.isThread?.()
  ) {
    const threadName =
      message.content.replace(/\s+/g, " ").trim().slice(0, 80) ||
      "Sandbox Session";

    try {
      const parentMessage = await message.channel.messages.fetch(message.id);
      const thread = await parentMessage.startThread({
        name: threadName,
        autoArchiveDuration: 1440, // 24 hours
        reason: "Start sandbox session",
      });

      await message.channel.send("Starting sandbox session...");

      // Create sandbox session with all required credentials
      const VERCEL_OIDC_TOKEN = process.env.VERCEL_OIDC_TOKEN;
      const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
      const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
      
      if (!VERCEL_OIDC_TOKEN) {
        await thread.send("❌ Error: VERCEL_OIDC_TOKEN environment variable is required for Vercel Sandboxes");
        return;
      }

      let sandbox;
      try {
        const credentials = { token: VERCEL_OIDC_TOKEN };
        if (VERCEL_PROJECT_ID) credentials.projectId = VERCEL_PROJECT_ID;
        if (VERCEL_TEAM_ID) credentials.teamId = VERCEL_TEAM_ID;

        console.log("Creating sandbox with credentials:", { 
          hasToken: !!VERCEL_OIDC_TOKEN, 
          projectId: VERCEL_PROJECT_ID, 
          teamId: VERCEL_TEAM_ID 
        });

        sandbox = await Sandbox.create({
          ...credentials,
          runtime: "node22",
          timeout: 300000, // 5 minutes
        });
      } catch (error) {
        console.error("Sandbox creation failed:", error);
        await thread.send(`❌ Error: Failed to create Vercel Sandbox: ${error.message}`);
        return;
      }
      const sessionId = `sandbox_${Date.now()}`;
      activeSandboxes.set(sessionId, sandbox);

      try {
        // Install opencode CLI globally in sandbox
        await thread.send("🔧 Setting up opencode CLI...");
        await sandbox.runCommand("npm", ["install", "-g", "@opencode-ai/cli"]);
        
        // Run opencode with user's input
        await thread.send("🤖 Processing with opencode...");
        const result = await sandbox.runCommand("opencode", [message.content]);
        
        if (result.exitCode === 0) {
          const output = await result.stdout() || "Command executed successfully (no output)";
          await thread.send(`**Output:**\n\`\`\`\n${output}\n\`\`\``);
        } else {
          const error = await result.stderr() || "Unknown error";
          await thread.send(`**Error:**\n\`\`\`\n${error}\n\`\`\``);
        }
      } catch (error) {
        await thread.send(`**Error:** Failed to execute opencode: ${error.message}`);
      }

    } catch (error) {
      console.error("Failed to create thread or execute code:", error);
      await message.channel.send("❌ Failed to start sandbox session");
    }
  }
});

client.login(DISCORD_BOT_TOKEN).catch((error) => {
  console.error("Failed to login to Discord:", error);
  process.exit(1);
});