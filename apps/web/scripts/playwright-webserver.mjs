import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const authSmokeEnabled = process.env.POKOPIA_AUTH_SMOKE === '1';
const buildEnv = {
  ...process.env,
  ...(authSmokeEnabled
    ? {
        VITE_SUPABASE_URL: 'http://127.0.0.1:4173/__supabase_mock',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_playwright',
      }
    : {}),
};

await run(npmCommand, ['run', 'build'], { env: buildEnv });

const preview = spawn(npmCommand, ['run', 'preview', '--', '--port', '4173', '--strictPort'], {
  env: process.env,
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    preview.kill(signal);
  });
}

const exitCode = await new Promise((resolve) => {
  preview.on('exit', (code, signal) => {
    if (signal) {
      resolve(0);
      return;
    }

    resolve(code ?? 0);
  });
});

process.exit(exitCode);

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal || code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}.`));
    });
  });
}
