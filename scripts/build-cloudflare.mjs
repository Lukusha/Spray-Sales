import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const databaseId = process.env.D1_DATABASE_ID || '';
if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(databaseId) || databaseId === '00000000-0000-4000-8000-000000000000') {
  throw new Error('Set the build variable D1_DATABASE_ID to the ID of your Cloudflare D1 database. Create a database named spray-sales-orders first.');
}
const workerName = process.env.WORKER_NAME || 'spray-sales';
if (!/^[a-z][a-z0-9-]{0,62}$/.test(workerName)) throw new Error('WORKER_NAME must be a valid lowercase Worker name.');
const build = spawnSync(process.execPath, ['scripts/run-framework.mjs', 'build'], {stdio:'inherit'});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status || 1);
const path = fileURLToPath(new URL('../dist/server/wrangler.json',import.meta.url));
const config = JSON.parse(readFileSync(path,'utf8'));
config.name = workerName;
config.workers_dev = true;
config.keep_vars = true; // Preserve provider settings entered in the dashboard on future deploys.
config.triggers = {crons:['*/5 * * * *']};
config.vars = {...config.vars, AUTH_PROVIDER:'cloudflare',ORDER_EMAIL_PROVIDER:'gmail',ORDER_EMAIL_FROM:'luka.beraia808@gmail.com'};
config.d1_databases = [{binding:'DB',database_name:process.env.D1_DATABASE_NAME || 'spray-sales-orders',database_id:databaseId,migrations_dir:'../../drizzle'}];
writeFileSync(path,JSON.stringify(config,null,2)+'\n');
console.log('Standalone Cloudflare build ready. Merchant access requires the ADMIN_PASSWORD runtime secret.');
