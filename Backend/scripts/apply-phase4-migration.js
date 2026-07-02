#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const sqlPath = path.resolve(__dirname, '..', 'database', 'phase4_indexes_and_soft_delete.sql');

if (!fs.existsSync(sqlPath)) {
  console.error('Migration SQL file not found:', sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('Found migration SQL:', sqlPath);

if (process.argv.includes('--show')) {
  console.log('\n--- BEGIN SQL ---\n');
  console.log(sql);
  console.log('\n--- END SQL ---');
  process.exit(0);
}

// If a Postgres connection string is provided via PGCONN / DATABASE_URL, optionally apply it.
const { exec } = require('child_process');
const pgconn = process.env.PGCONN || process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION;
if (pgconn) {
  const wantsApply = process.argv.includes('--apply');
  console.log('\nPG connection detected in env.');
  if (!wantsApply) {
    console.log('To apply using psql run:');
    console.log('\n  psql "' + pgconn + '" -f ' + sqlPath + '\n');
    console.log('Or re-run this script with `--apply` to attempt to run `psql` automatically.');
    process.exit(0);
  }

  console.log('Attempting to apply migration using `psql` (requires psql in PATH)...');
  const cmd = 'psql "' + pgconn + '" -f ' + sqlPath;
  exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
    if (err) {
      console.error('Automatic `psql` execution failed; here is stderr:');
      console.error(stderr || err.message);
      console.error('\nFalling back to printing SQL and manual instructions.');
      console.log('\n--- BEGIN SQL ---\n');
      console.log(sql);
      console.log('\n--- END SQL ---');
      process.exit(1);
    }
    console.log('psql output:\n', stdout);
    console.log('Migration applied (psql reported success).');
    process.exit(0);
  });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (supabaseUrl && supabaseKey) {
  console.log('\nSupabase service role key detected.');
  console.log('You can apply the SQL via the Supabase SQL editor (Project → SQL Editor) by pasting the SQL below.');
  console.log('\n--- BEGIN SQL ---\n');
  console.log(sql);
  console.log('\n--- END SQL ---');
  process.exit(0);
}

console.log('\nNo database connection info detected in environment.');
console.log('To apply this migration:');
console.log('- Open the file at', sqlPath, 'and paste it into the Supabase SQL editor (recommended).');
console.log('- Or set a Postgres connection string in env var `PGCONN` or `DATABASE_URL` and run:');
console.log('\n  PGCONN="your-connection-string" node scripts/apply-phase4-migration.js\n');
console.log('To attempt automatic apply (psql required), run with `--apply`.');
console.log('To only print the SQL without guidance, run with `--show`.');

process.exit(0);
