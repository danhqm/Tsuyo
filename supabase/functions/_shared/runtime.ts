import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import Stripe from 'npm:stripe@23.0.0';
import { makeCommerce } from './commerce.mjs';
import { stripeConfiguration,makePaymentTools } from './payments.mjs';
const namedKey=(name:string,legacy:string)=> {
  const value=Deno.env.get(name); return value?JSON.parse(value).default:Deno.env.get(legacy);
};
export const url=Deno.env.get('SUPABASE_URL')!;
export const publicKey=namedKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY')!;
const serverKey=namedKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY')!;
const options={auth:{persistSession:false,autoRefreshToken:false}};
export const db=createClient(url,serverKey,options);
export const auth=createClient(url,publicKey,options);
const stripeKey=Deno.env.get('STRIPE_SECRET_KEY');
const stripeConfig=stripeConfiguration(stripeKey,Deno.env.get('STRIPE_MODE')||'test');
export const paymentMode=stripeConfig.mode;
export const stripe=stripeConfig.valid?new Stripe(stripeKey!,{httpClient:Stripe.createFetchHttpClient()}):null;
export const cryptoProvider=Stripe.createSubtleCryptoProvider();
export const storeURL=(Deno.env.get('STORE_URL')||'http://localhost:5173').replace(/\/$/,'');
export const payments=makePaymentTools({stripe,mode:paymentMode,storeURL,expectedAccount:Deno.env.get('STRIPE_ACCOUNT_ID'),webhookConfigured:!!Deno.env.get('STRIPE_WEBHOOK_SECRET')});
export const commerce=makeCommerce({db,auth,stripe,storeURL,payments,paymentMode,sandboxBagEnabled:Deno.env.get('STORE_SANDBOX_BAG_CHECKOUT')==='true',publishableKey:publicKey,webhookConfigured:!!Deno.env.get('STRIPE_WEBHOOK_SECRET'),allowedOrigins:(Deno.env.get('STORE_ALLOWED_ORIGINS')||'').split(',').map(v=>v.trim()).filter(Boolean),
  scopedClient:(token:string)=>createClient(url,publicKey,{...options,global:{headers:{Authorization:`Bearer ${token}`}}})});
export async function checked<T>(promise:PromiseLike<{data:T,error:unknown}>) {
  const {data,error}=await promise; if(error) throw new Error('Database operation failed.'); return data;
}
