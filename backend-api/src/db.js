'use strict';
require('./pgtypes'); // DATE -> string mentah (lihat src/pgtypes.js)
const knexLib = require('knex');
const config = require('./config');

let knex = null;

function getDb() {
  if (!knex) {
    knex = knexLib({
      client: 'pg',
      connection: config.databaseUrl || undefined,
      pool: { min: 0, max: 10 },
    });
  }
  return knex;
}

// Jalankan semua migration (dipanggil sekali pas boot + di test).
async function runMigrations(db = getDb()) {
  const [, applied] = await db.migrate.latest();
  return applied;
}

async function closeDb() {
  if (knex) {
    await knex.destroy();
    knex = null;
  }
}

module.exports = { getDb, runMigrations, closeDb };
