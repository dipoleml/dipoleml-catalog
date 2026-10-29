import type { Plugin as V2Plugin } from '@opencode/plugin/effect/plugin';
import type { Plugin } from '@opencode-ai/plugin';
import { createCCSafetyNetPlugin } from '@/hosts/opencode/plugin';
import { createOpenCodeV2Plugin } from '@/hosts/opencode/v2';

export const CCSafetyNetPlugin: Plugin = createCCSafetyNetPlugin();

const plugin: { id: string; server: Plugin } = {
  ...createOpenCodeV2Plugin(),
  server: CCSafetyNetPlugin,
} satisfies V2Plugin & { server: Plugin };

export default plugin;
