#!/usr/bin/env node
console.warn('\x1b[33m%s\x1b[0m', 'Warning: create-tsrouter-app is deprecated. Use "tanstack create --router-only" or "npx @tanstack/cli create --router-only" instead.')
console.warn('\x1b[33m%s\x1b[0m', '         This defaults to router-only compatibility mode (file-based routing, no Start-specific add-ons).\n')

import { cli } from '@tanstack/cli'

cli({
  name: 'create-tsrouter-app',
  appName: 'TanStack',
  legacyAutoCreate: true,
  defaultRouterOnly: true,
})
