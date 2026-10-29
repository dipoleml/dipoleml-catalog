#!/usr/bin/env node
import { initDb } from '../db/schema.js';
import { runBuddyGraphCli } from '../lib/reasoning/graph-viz.js';

export function runGraphCommand(argv: string[]): number {
  try {
    initDb();
  } catch (error) {
    console.error(`Failed to initialize Buddy database: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  try {
    return runBuddyGraphCli(argv);
  } catch (error) {
    console.error(`Failed to generate Buddy graph: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

const invokedPath = process.argv[1] || '';
if (invokedPath.endsWith('/graph-cli.js') || invokedPath.endsWith('\\graph-cli.js')) {
  process.exit(runGraphCommand(process.argv.slice(2)));
}
