import { commerce } from '../_shared/runtime.ts';
// Guests may quote/checkout/subscribe. User tokens are verified in code; staff actions also check the private staff table.
Deno.serve(commerce.handle);
