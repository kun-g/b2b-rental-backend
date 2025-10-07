import process from 'node:process';
import { runCommand } from './run-command.js';

export async function script() {
  const port = process.env.CMS_PORT ?? '4002';
  await runCommand('pnpm', ['exec', 'next', 'dev', '-p', port]);
}
