import { runCommand } from './run-command.js';

export async function script() {
  await runCommand('pnpm', ['exec', 'next', 'build']);
}
