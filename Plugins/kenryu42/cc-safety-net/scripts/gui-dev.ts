import { buildGuiDocument } from '../src/gui/assets';
import { runGuiCommand } from '../src/gui/index';

process.exit(await runGuiCommand(process.argv.slice(2), { buildDocument: buildGuiDocument }));
