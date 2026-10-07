import assert from 'node:assert/strict';
const response=await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/store-jobs`,{method:'POST',headers:{Authorization:`Bearer ${process.env.STORE_JOB_SECRET}`},body:'{}',signal:AbortSignal.timeout(20000)});
assert.equal(response.status,200);const result=await response.json();assert.equal(typeof result.reconciled,'number');assert.equal(typeof result.sent,'number');console.log('Authenticated maintenance job passed.',result);
