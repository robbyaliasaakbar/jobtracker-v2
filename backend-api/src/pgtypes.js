'use strict';
const pg = require('pg');

// DATE Postgres (OID 1082) -> biarin string mentah 'yyyy-mm-dd'.
// Default pg mengubahnya jadi Date local-midnight, yang bisa geser sehari
// pas dikonversi ke UTC (server WIB). Paritas dengan backend lama juga dapat.
pg.types.setTypeParser(1082, (v) => v);

module.exports = pg;
