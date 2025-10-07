import { spawn } from 'node:child_process';
import process from 'node:process';

const shell = process.platform === 'win32';

export function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 0}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}
