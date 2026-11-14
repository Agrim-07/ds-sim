import { spawn } from 'node:child_process';

const MIN_NODE_MAJOR = 20;
const major = Number(process.versions.node.split('.')[0]);
if (major < MIN_NODE_MAJOR) {
  console.error(`ds-sim needs Node.js ${MIN_NODE_MAJOR} or newer. You have ${process.version}. Download it from https://nodejs.org`);
  process.exit(1);
}

const { loadConfig } = await import('../server/config.js');
const { startServer } = await import('../server/index.js');
const { createLogger } = await import('../server/logger.js');

function openBrowser(url) {
  const launchers = {
    win32: ['cmd', ['/c', 'start', '""', url]],
    darwin: ['open', [url]],
  };
  const [command, args] = launchers[process.platform] ?? ['xdg-open', [url]];
  try {
    const child = spawn(command, args, { stdio: 'ignore', detached: true, windowsVerbatimArguments: process.platform === 'win32' });
    child.on('error', () => {});
    child.unref();
  } catch {
    // No browser launcher available (for example on a headless server); the URL is printed below.
  }
}

const config = loadConfig();
try {
  const server = await startServer(config, { logger: createLogger({ silent: !process.argv.includes('--verbose') }) });
  const url = `http://localhost:${server.address().port}/`;
  console.log(`\n  ds-sim is running at ${url}\n  Press Ctrl+C to stop.\n`);
  if (!process.argv.includes('--no-open') && !process.env.CI) openBrowser(url);
} catch (error) {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Start with a different port, for example: PORT=3001`);
  } else {
    console.error(error.message);
  }
  process.exit(1);
}
