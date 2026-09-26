'use strict';
const config = require('./config');
const { runMigrations, closeDb } = require('./db');
const { createApp } = require('./app');

async function main() {
  // Migration jalan sekali pas boot — container baru langsung punya skema.
  // DB mati/kredensial salah => exit(1) => restart:always coba lagi sendiri.
  try {
    const applied = await runMigrations();
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      msg: applied > 0 ? 'migrations applied' : 'schema up-to-date',
      applied,
    }));
  } catch (e) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: 'migrate gagal', error: e.message }));
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(JSON.stringify({ ts: new Date().toISOString(), msg: 'listening', port: config.port }));
  });

  const shutdown = (sig) => {
    console.log(JSON.stringify({ ts: new Date().toISOString(), msg: 'shutdown', sig }));
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((e) => {
  console.error(JSON.stringify({ ts: new Date().toISOString(), msg: 'fatal', error: e.message }));
  process.exit(1);
});
