---
description: Scaffold a new project that uses the Bankr x402 SDK
argument-hint: [project-type]
allowed-tools: Read, Write, Bash, AskUserQuestion, Glob, Grep
---

# x402 SDK Project Scaffold

Create a complete TypeScript/Node.js project scaffold for building on the Bankr x402 SDK.

## Process

1. **Determine project type** - If `$ARGUMENTS` specifies a type, use it. Otherwise, ask the user.

   Load the `x402-project-templates` skill for available types:
   - **bot** - Automated trading bot, price monitor, portfolio rebalancer, scheduled task
   - **web-service** - HTTP API that wraps Bankr SDK for mobile apps or integrations
   - **dashboard** - Web UI for portfolio tracking, swap interface, monitoring
   - **cli** - Command-line tool for Bankr operations

2. **Ask for project details**:
   - Project name (kebab-case, e.g., `my-trading-bot`)
   - Brief description of what it will do
   - Any specific SDK operations it will use (swaps, transfers, queries, NFTs, leverage)
   - Package manager preference: **bun** (recommended - faster) or **npm**

3. **Create project structure**:
   - Load `x402-project-templates` skill for the directory structure
   - Load `x402-client-patterns` skill for common files and client code
   - Create all directories using `mkdir -p`
   - Write each file using the Write tool
   - Customize based on user's description

4. **Explain next steps**:
   - How to set up the payment wallet (private key with USDC on Base)
   - How to run the project (use selected package manager: `bun install && bun dev` or `npm install && npm run dev`)
   - What to customize first based on their use case

## Skills to Load

**Core Skills (always load):**
- `x402-project-templates` - Directory structures for each project type
- `x402-client-patterns` - bankr-client.ts and common files (package.json, tsconfig.json, .env.example, .gitignore)
- `sdk-capabilities` - SDK operation reference

**Capability Skills (load based on project purpose):**
- `sdk-token-swaps` - For trading bots: swap patterns, approval handling
- `sdk-transaction-builder` - For custom transfers, NFT ops, bridges
- `sdk-balance-queries` - For dashboards: portfolio queries, balance tracking
- `sdk-wallet-operations` - For multi-wallet setups
- `sdk-job-management` - For advanced: job polling, cancellation

## Implementation Notes

- Create all directories first using `mkdir -p`
- Write each file using the Write tool
- Include helpful comments in generated code
- Generate a README.md with setup instructions and usage examples
