exports.up = (k) => k.schema.createTable('lamaran', (t) => {
  t.increments('id').primary();
  t.string('email').notNullable().index();
  t.string('company').defaultTo('');
  t.string('position').defaultTo('');
  t.date('tanggal');
  t.string('status').defaultTo('baru');
  t.string('portal').defaultTo('');
  t.text('link').defaultTo('');
  t.timestamps(true, true);
});

exports.down = (k) => k.schema.dropTable('lamaran');
