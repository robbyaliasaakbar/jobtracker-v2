'use strict';
const config = require('./src/config');

// Dipakai CLI `npm run migrate` (knex migrate:latest) maupun pemakaian programatik.
const base = { client: 'pg', connection: config.databaseUrl || undefined, pool: { min: 0, max: 5 } };

module.exports = {
  development: base,
  production: base,
  test: { ...base, connection: config.testDatabaseUrl || undefined },
};
