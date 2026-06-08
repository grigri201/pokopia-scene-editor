import { spawn } from 'node:child_process';

const playwrightCommand = process.platform === 'win32' ? 'playwright.cmd' : 'playwright';
const child = spawn(
  playwrightCommand,
  ['test', '--project=chromium', '--workers=1', '-g', 'auth regression smoke'],
  {
    env: {
      ...process.env,
      POKOPIA_AUTH_SMOKE: '1',
    },
    stdio: 'inherit',
  },
);

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(0);
    return;
  }

  process.exit(code ?? 0);
});
