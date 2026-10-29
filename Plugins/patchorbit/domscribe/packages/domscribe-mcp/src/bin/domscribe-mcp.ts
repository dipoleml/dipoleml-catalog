#!/usr/bin/env node
import { program } from '@domscribe/relay/program';

program.parse(['npx', 'domscribe', 'mcp', ...process.argv.slice(2)]);
