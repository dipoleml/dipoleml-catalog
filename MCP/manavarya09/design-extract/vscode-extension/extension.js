const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');

function workspaceRoot() {
  const folders = vscode.workspace.workspaceFolders;
  return folders && folders.length > 0 ? folders[0].uri.fsPath : process.cwd();
}

async function promptForUrl() {
  return vscode.window.showInputBox({
    prompt: 'URL to extract design from',
    placeHolder: 'https://stripe.com',
    ignoreFocusOut: true,
    validateInput: (v) => {
      try { new URL(v.startsWith('http') ? v : `https://${v}`); return null; }
      catch { return 'Enter a valid URL'; }
    },
  });
}

function runDesignlang(url, args, cwd, outputChannel) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['-y', 'designlang', url, ...args], {
      cwd, shell: process.platform === 'win32',
    });
    child.stdout.on('data', (d) => outputChannel.append(d.toString()));
    child.stderr.on('data', (d) => outputChannel.append(d.toString()));
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`designlang exited with code ${code}`)));
  });
}

async function extractFromUrl() {
  const url = await promptForUrl();
  if (!url) return;

  const cfg = vscode.workspace.getConfiguration('designlang');
  const outDir = cfg.get('outputDir', './design-extract-output');
  const extra = (cfg.get('extraArgs', '') || '').trim();
  const args = ['--out', outDir, ...(extra ? extra.split(/\s+/) : [])];

  const channel = vscode.window.createOutputChannel('designlang');
  channel.show(true);
  channel.appendLine(`> designlang ${url} ${args.join(' ')}`);

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'designlang: extracting...', cancellable: false },
    async () => runDesignlang(url, args, workspaceRoot(), channel)
  );

  const absOut = path.resolve(workspaceRoot(), outDir);
  const uri = vscode.Uri.file(absOut);
  vscode.window.showInformationMessage(`designlang: extracted to ${outDir}`, 'Open folder').then((choice) => {
    if (choice === 'Open folder') vscode.commands.executeCommand('revealFileInOS', uri);
  });
}

async function extractAndInject() {
  const url = await promptForUrl();
  if (!url) return;

  const channel = vscode.window.createOutputChannel('designlang');
  channel.show(true);
  channel.appendLine(`> designlang apply ${url}`);

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'designlang: applying to workspace...', cancellable: false },
    async () => runDesignlang(url, ['apply', '--dir', '.'], workspaceRoot(), channel)
  );

  vscode.window.showInformationMessage('designlang: tokens applied to workspace.');
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('designlang.extractFromUrl', extractFromUrl),
    vscode.commands.registerCommand('designlang.extractAndInject', extractAndInject),
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
