# Contributing to mail-cli

Thank you for your interest in contributing to mail-cli!

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Mirai3103/mail-cli.git
   cd mail-cli
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Verify your setup:
   ```bash
   bun test
   ```

## Code Style

This project uses Biome for formatting and linting.

```bash
# Auto-format all files
bun run format

# Check for linting issues
bun run lint
```

## Testing

```bash
# Run all tests
bun test

# Run tests with coverage report
bun test --coverage
```

**Coverage Requirements:** Business logic in `src/services/` should maintain a minimum of 80% code coverage.

## Making Changes

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes and ensure all tests pass:
   ```bash
   bun test
   bun run lint
   ```

3. Commit your changes with a clear message:
   ```bash
   git commit -m "feat: add new feature description"
   ```

4. Push to your branch and submit a pull request.

## Architecture

mail-cli follows Clean Architecture with four layers:

- **src/commands/** - CLI command handlers (list, read, send, search, etc.)
- **src/services/** - Business logic (MailboxService, EmailService, ComposeService, AccountService)
- **src/types/** - Port interfaces and domain types (EmailProviderPort, TokenStoragePort, ConfigPort)
- **src/infrastructure/** - Provider implementations (GmailProvider, OutlookProvider, TokenStorageImpl, ConfigImpl)

Data flows: CLI command -> service -> provider -> API

## Available Commands

| Command | Description |
|---------|-------------|
| `bun run build` | Build the CLI for distribution |
| `bun run format` | Auto-format code with Biome |
| `bun run lint` | Check code for linting issues |
| `bun test` | Run test suite |

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
