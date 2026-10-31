import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const configPath='dist/server/wrangler.json';
const config=JSON.parse(readFileSync(configPath,'utf8'));
if(config.vars?.AUTH_PROVIDER!=='cloudflare') throw new Error('Run npm run build:cloudflare first.');
for(const args of [
  ['d1','migrations','apply','DB','--remote','--config',configPath],
  ['deploy','--config',configPath],
]) {
  const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{stdio:'inherit',env:{...process.env,CI:'true'}});
  if(result.error) throw result.error;
  if(result.status!==0) process.exit(result.status||1);
}
