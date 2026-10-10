import { stripe,cryptoProvider,commerce,db,paymentMode } from '../_shared/runtime.ts';
import { makeWebhook } from '../_shared/webhook.mjs';
Deno.serve(makeWebhook({stripe,cryptoProvider,commerce,db,secret:Deno.env.get('STRIPE_WEBHOOK_SECRET'),expectedLiveMode:paymentMode==='live'}));
