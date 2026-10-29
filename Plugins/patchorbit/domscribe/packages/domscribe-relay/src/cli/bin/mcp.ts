#!/usr/bin/env node
/**
 * The domscribe-mcp command
 */
import { program } from '../program.js';

program.parse(['npx', 'domscribe', 'mcp', ...process.argv.slice(2)]);
