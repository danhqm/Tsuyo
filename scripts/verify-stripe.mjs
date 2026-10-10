import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const site=process.env.VITE_SUPABASE_URL;
assert.equal(site,'https://bhodifcqtkajjojvuqtk.supabase.co');
mkdirSync('tmp',{recursive:true});
writeFileSync('tmp/stripe-job-auth.sql',"select decrypted_secret as token from vault.decrypted_secrets where name='tsuyo_job_secret';");
const output=spawnSync('npx.cmd',['supabase','db','query','--linked','--file','tmp/stripe-job-auth.sql','--output-format','json'],{encoding:'utf8',shell:true,windowsHide:true});
if(output.status!==0)throw Error('Could not access the existing maintenance authorization.');
const token=JSON.parse(output.stdout).rows[0]?.token;
assert.ok(token);
const operation=process.argv[2]||'health';
const body={action:`stripe-${operation==='checkout'?'test-checkout':operation==='result'?'test-result':'health'}`};
if(operation==='result')body.session_id=JSON.parse(readFileSync('tmp/stripe-run.json','utf8')).session_id;
const response=await fetch(`${site}/functions/v1/store-jobs`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
if(!response.ok)throw Error(`Sandbox verification failed (${response.status}): ${await response.text()}`);
const result=await response.json();
if(operation==='checkout'){
 assert.ok(result.session_id.startsWith('cs_test_'));assert.ok(result.url.startsWith('https://checkout.stripe.com/'));
 writeFileSync('tmp/stripe-run.json',JSON.stringify(result));console.log('Stripe sandbox Checkout Session created. Its URL is saved in the ignored verification file.');
} else {
 console.log(JSON.stringify(result));
 if(operation==='health'){assert.equal(result.mode,'test');assert.equal(result.connected,true);assert.equal(result.webhook_configured,true);}
}
