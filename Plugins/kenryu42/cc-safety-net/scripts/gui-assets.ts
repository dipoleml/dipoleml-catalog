import type { BunPlugin } from 'bun';

function freezeModulePlugin(namespace: object, filter: RegExp): BunPlugin {
  const contents = Object.entries(namespace)
    .map(([name, value]) => `export const ${name} = ${JSON.stringify(value)};`)
    .join('\n');
  return {
    name: `freeze ${filter.source}`,
    setup(build) {
      build.onLoad({ filter }, () => ({ contents, loader: 'js' }));
    },
  };
}

// `args.path` is native, so the separator is a backslash on Windows.
export const freezeGuiAssetsPlugin = async () =>
  freezeModulePlugin(await import('../src/gui/assets'), /src[\\/]gui[\\/]assets\.ts$/);

export const freezeSkillTemplatePlugin = async () =>
  freezeModulePlugin(
    await import('../src/hosts/templates/cc-safety-net'),
    /src[\\/]hosts[\\/]templates[\\/]cc-safety-net\.ts$/,
  );
