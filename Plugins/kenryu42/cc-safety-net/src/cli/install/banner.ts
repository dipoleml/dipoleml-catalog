import * as readline from 'node:readline';
import {
  type LolcatAnimationOptions,
  type LolcatOutput,
  writeAnimatedLolcat,
} from '@/cli/utils/lolcat';

type InstallBannerOptions = Pick<LolcatAnimationOptions, 'seed' | 'sleep'> & {
  input?: NodeJS.ReadStream;
  onInterrupt?: () => void;
  output?: LolcatOutput;
};

type KeyPress = {
  name?: string;
  ctrl?: boolean;
};

const INSTALL_ASCII_ART = [
  '┏━┛┏━┛  ┏━┛┏━┃┏━┛┏━┛━┏┛┃ ┃  ┏━ ┏━┛━┏┛',
  '┃  ┃    ━━┃┏━┃┏━┛┏━┛ ┃ ━┏┛  ┃ ┃┏━┛ ┃ ',
  '━━┛━━┛  ━━┛┛ ┛┛  ━━┛ ┛  ┛   ┛ ┛━━┛ ┛ ',
].join('\n');

function shouldPrintInstallBanner(output: LolcatOutput) {
  return Boolean(output.isTTY);
}

export async function printInstallBanner(options: InstallBannerOptions = {}) {
  const output = options.output ?? process.stdout;
  if (!shouldPrintInstallBanner(output)) return;

  const input = options.input ?? process.stdin;
  const animationOptions = {
    output,
    seed: options.seed ?? Math.random() * 8192,
    sleep: options.sleep,
  };
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    await writeAnimatedLolcat(INSTALL_ASCII_ART, animationOptions);
    return;
  }

  const controller = new AbortController();
  const wasFlowing = input.readableFlowing === true;
  const wasRaw = input.isRaw === true;
  let interrupted = false;
  const onKeyPress = (_inputValue: string, key: KeyPress) => {
    if (key.ctrl && key.name === 'c') interrupted = true;
    if (interrupted || key.name === 'return' || key.name === 'enter') controller.abort();
  };

  readline.emitKeypressEvents(input);
  input.on('keypress', onKeyPress);
  input.setRawMode(true);
  input.resume();

  try {
    await writeAnimatedLolcat(INSTALL_ASCII_ART, {
      ...animationOptions,
      signal: controller.signal,
    });
  } finally {
    input.off('keypress', onKeyPress);
    input.setRawMode(wasRaw);
    if (!wasFlowing) input.pause();
  }

  if (!interrupted) return;
  if (options.onInterrupt) {
    options.onInterrupt();
    return;
  }
  process.kill(process.pid, 'SIGINT');
}
