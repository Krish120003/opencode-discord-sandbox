# Effect Opencode Discord Bot

A next-generation Discord sandbox bot using Effect.ts for functional programming patterns and opencode for code execution.

## Features

- 🚀 **Effect.ts Architecture**: Functional programming with robust error handling
- 🔧 **Opencode Integration**: Modern code execution with opencode SDK
- 🤖 **Discord Threads**: Thread-per-conversation model
- 🛡️ **Type Safety**: Full TypeScript coverage with Effect schemas
- 🧪 **Comprehensive Testing**: Unit and integration tests with high coverage
- 🔄 **CI/CD Pipeline**: Automated testing, linting, and deployment
- 📊 **Observability**: Structured logging and error tracking

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 10.4.1+
- Discord bot token
- Opencode API access

### Installation

```bash
# Clone the repository
git clone https://github.com/Krish120003/opencode-discord-sandbox.git
cd opencode-discord-sandbox

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env
# Edit .env with your tokens and IDs

# Run in development
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

### Environment Variables

```bash
# Required
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=your_target_channel_id

# Optional
SANDBOX_TIMEOUT=300000          # 5 minutes default
SANDBOX_MAX_MEMORY=1024         # 1GB default  
SANDBOX_MAX_CPUS=2              # 2 CPUs default
```

## Development

### Scripts

```bash
pnpm dev          # Start development server with hot reload
pnpm build        # Build TypeScript to JavaScript
pnpm start        # Start production server
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm test:coverage # Run tests with coverage report
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix linting issues
pnpm typecheck    # Run TypeScript type checking
```

### Architecture

```
src/
├── application/          # Application layer
│   ├── services/         # Business logic services
│   └── handlers/         # Discord event handlers
├── domain/              # Domain models and types
│   ├── commands/        # Command definitions
│   ├── sandbox/         # Sandbox execution types
│   └── discord/         # Discord-related types
├── infrastructure/      # External integrations
│   ├── discord/         # Discord client setup
│   ├── opencode/        # Opencode integration
│   └── vercel/          # Vercel sandbox client
├── config/              # Configuration management
└── utils/               # Shared utilities
```

## Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Test individual services and utilities
- **Integration Tests**: Test complete flows between services
- **Mocking**: External dependencies are mocked for reliable testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode during development
pnpm test:watch
```

## Deployment

### Manual Deployment

```bash
# Build the project
pnpm build

# Deploy the dist/ folder to your hosting provider
```

### Automated Deployment

The project includes GitHub Actions workflows for:

- **CI/CD Pipeline**: Automated testing and deployment on push to main
- **Linting**: Code quality checks on every PR
- **Releases**: Automated releases when tags are pushed

## Discord Setup

1. **Create Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application and bot

2. **Enable Intents**:
   - Message Content Intent (required)
   - Server Members Intent (optional)
   - Presence Intent (optional)

3. **Bot Permissions**:
   - Read Messages/View Channels
   - Send Messages
   - Create Public Threads
   - Send Messages in Threads

4. **Invite Bot**:
   - Generate invite link with required permissions
   - Add bot to your server

## Usage

1. **Start a Session**: Post a message in the configured channel
2. **Thread Creation**: Bot automatically creates a thread for the conversation
3. **Continue Conversation**: Reply in the thread to continue the same session
4. **Code Execution**: Bot uses opencode to execute and respond to code requests

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Convention

We use [Conventional Commits](https://conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code formatting changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

## License

MIT © 2025 [Your Name]. See [LICENSE](LICENSE) for details.

## Acknowledgments

- Original [claude-sandbox-bot](https://github.com/RhysSullivan/claude-sandbox-bot) for inspiration
- [Effect.ts](https://effect.website/) for excellent functional programming toolkit
- [Opencode](https://github.com/sst/opencode) for modern code execution
- [Discord.js](https://discord.js.org/) for Discord API integration