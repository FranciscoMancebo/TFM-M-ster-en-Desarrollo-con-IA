import { readFile, rm } from 'node:fs/promises';
import net from 'node:net';

const lockPath = new URL('../.vinext/dev/lock.json', import.meta.url);
const expectedPort = 4173;

async function acceptsConnections(port, host) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    const finish = (result) => {
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(500);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
  });
}

async function portIsReachable(port) {
  return (await acceptsConnections(port, '127.0.0.1'))
    || (await acceptsConnections(port, '::1'));
}

let lock;
try {
  lock = JSON.parse(await readFile(lockPath, 'utf8'));
} catch (error) {
  if (error?.code === 'ENOENT') process.exit(0);
  console.warn(`Playwright could not read the Vinext development lock: ${error.message}`);
  process.exit(0);
}

const lockedPort = Number(lock.port);
if (Number.isInteger(lockedPort) && await portIsReachable(lockedPort)) {
  if (lockedPort !== expectedPort) {
    console.error(
      `Vinext is already running on port ${lockedPort}. Stop that development server before running the E2E suite on port ${expectedPort}.`,
    );
    process.exit(1);
  }
  process.exit(0);
}

await rm(lockPath, { force: true });
console.log('Removed a stale Vinext development-server lock before E2E startup.');
