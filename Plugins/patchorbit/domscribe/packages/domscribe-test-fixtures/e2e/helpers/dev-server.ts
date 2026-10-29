/**
 * Dev Server - Start/stop fixture dev servers programmatically
 *
 * Used by E2E tests to run fixtures with a live dev server.
 * Detects readiness by polling the HTTP port rather than parsing stdout,
 * which is fragile across frameworks, versions, and ANSI formatting.
 */

import { spawn, type ChildProcess } from 'child_process';
import { createServer } from 'net';
import { join } from 'path';
import {
  getFixtureById,
  type DiscoveredFixture,
} from '../../shared/fixture-registry.js';

export interface DevServerHandle {
  /** Base URL of the running dev server */
  url: string;
  /** Port the server is listening on */
  port: number;
  /** Stop the dev server */
  close: () => Promise<void>;
}

/**
 * Start a dev server for the given fixture.
 *
 * @param fixtureId - Fixture ID from fixture.json
 * @param options - Optional overrides
 * @returns Handle to the running dev server
 */
export async function startDevServer(
  fixtureId: string,
  options?: { port?: number; timeout?: number },
): Promise<DevServerHandle> {
  const fixture = getFixtureById(fixtureId);
  if (!fixture) {
    throw new Error(`Fixture not found: ${fixtureId}`);
  }

  return startDevServerForFixture(fixture, options);
}

/**
 * Find a free TCP port by briefly binding to port 0.
 */
async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error('Could not determine port')));
      }
    });
    srv.on('error', reject);
  });
}

/**
 * Poll an HTTP endpoint until it responds (any status) or timeout.
 */
async function waitForHttp(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  const pollInterval = 300;

  while (Date.now() - start < timeoutMs) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return true;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  return false;
}

/**
 * Start a dev server from a discovered fixture.
 */
export async function startDevServerForFixture(
  fixture: DiscoveredFixture,
  options?: { port?: number; timeout?: number },
): Promise<DevServerHandle> {
  const { manifest, path: fixturePath } = fixture;
  const { devServer } = manifest;
  const timeout = options?.timeout ?? 30_000;

  // Always use an explicit port so we know where to poll.
  // If the fixture or caller specifies 0, grab a free one.
  const requestedPort =
    options?.port && options.port > 0
      ? options.port
      : devServer.port > 0
        ? devServer.port
        : await getFreePort();

  const [cmd, ...args] = devServer.command.split(' ');
  args.push('--port', String(requestedPort));

  let output = '';

  const child: ChildProcess = spawn(cmd, args, {
    cwd: fixturePath,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PATH: `${join(fixturePath, 'node_modules', '.bin')}:${process.env['PATH']}`,
    },
    shell: true,
  });

  // Accumulate output for error reporting
  const onData = (data: Buffer) => {
    output += data.toString();
  };
  child.stdout?.on('data', onData);
  child.stderr?.on('data', onData);

  // Reject if the process exits before becoming ready
  const exitPromise = new Promise<never>((_resolve, reject) => {
    child.on('error', (err) => {
      reject(
        new Error(
          `Failed to spawn dev server for ${manifest.id}: ${err.message}`,
        ),
      );
    });
    child.on('exit', (code) => {
      if (code !== null && code !== 0) {
        reject(
          new Error(
            `Dev server for ${manifest.id} exited with code ${code}.\nOutput:\n${output}`,
          ),
        );
      }
    });
  });

  const url = `http://localhost:${requestedPort}`;

  // Race: HTTP poll vs process exit vs timeout
  const ready = await Promise.race([
    waitForHttp(url, timeout),
    exitPromise,
    new Promise<false>((resolve) => setTimeout(() => resolve(false), timeout)),
  ]);

  if (!ready) {
    child.kill();
    throw new Error(
      `Dev server for ${manifest.id} failed to start within ${timeout}ms.\nOutput:\n${output}`,
    );
  }

  return {
    url: url.replace(/\/$/, ''),
    port: requestedPort,
    close: async () => {
      child.kill('SIGTERM');
      await new Promise<void>((res) => {
        child.on('exit', () => res());
        setTimeout(() => {
          child.kill('SIGKILL');
          res();
        }, 5000);
      });
    },
  };
}
