#!/usr/bin/env node
/**
 * Domscribe CLI
 *
 * Commands:
 *   serve   - Start the relay server (foreground or daemon)
 *   stop    - Stop a running daemon
 *   status  - Check relay status
 *   mcp     - Start MCP adapter for agent integration
 */
import { program } from '../program.js';

program.parse();
