/**
 * One command that starts the whole app.
 *
 * `npm run dev` used to start only the web app, so the browser came up and
 * every request failed until you noticed the server was not running and started
 * it in a second terminal. That is a papercut the first time and a real
 * obstacle for anybody who did not build this — the app has two halves and
 * neither is useful alone.
 *
 * NO PROCESS-RUNNER DEPENDENCY. concurrently and npm-run-all both do this well,
 * and neither is worth a dependency for thirty lines: spawning two children and
 * forwarding their output is the whole job.
 *
 * IF EITHER HALF DIES, BOTH DO. A web app talking to a dead server looks like a
 * bug in the app, and a server with no client is a process quietly holding a
 * port. Failing together makes the actual error the thing you see.
 */
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/** Colour the prefix so two interleaved streams stay readable. */
const LABELS = {
  server: '[36m[server][0m',
  web: '[35m[web]   [0m',
};

const children = [];
let shuttingDown = false;

function run(name, args) {
  /**
   * `shell: true` is required on Windows — npm is a .cmd, and spawn cannot run
   * one without a shell. Node warns that shell mode concatenates arguments
   * rather than escaping them, which is a real hazard when arguments come from
   * outside; here every one is a literal written three lines below, so there is
   * nothing to escape and nothing a caller could inject.
   */
  const child = spawn(npm, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  const forward = (stream) => {
    stream.setEncoding('utf8');
    let rest = '';
    stream.on('data', (chunk) => {
      const lines = (rest + chunk).split('\n');
      rest = lines.pop() ?? '';
      for (const line of lines) console.log(`${LABELS[name]} ${line}`);
    });
  };
  forward(child.stdout);
  forward(child.stderr);

  child.on('exit', (code) => {
    if (shuttingDown) return;
    console.log(`${LABELS[name]} exited (${String(code ?? 0)}) — stopping the other half too.`);
    stop(code ?? 1);
  });

  children.push(child);
  return child;
}

function stop(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) c.kill();
  process.exit(code);
}

process.on('SIGINT', () => { stop(0); });
process.on('SIGTERM', () => { stop(0); });

/* Each half announces its own address once it is listening. Printing them here
   would be a guess — .env.local can move either one, and a banner that names
   the wrong port sends somebody to a dead tab. */
console.log('Starting Questra. Both halves print their address below; Ctrl-C stops both.\n');
run('server', ['run', 'dev', '-w', '@questra/server']);
run('web', ['run', 'dev', '-w', '@questra/web']);
