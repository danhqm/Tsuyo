import { writeFile, readdir } from 'node:fs/promises';
import { products } from '../src/catalog.js';
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const files = await readdir('supabase/migrations');
const target = files.find((file) => file.endsWith('_tsuyo_catalog_seed.sql'));
if (!target) throw new Error('Create the seed migration with Supabase CLI first.');
let sql = '-- Starter catalog: drafts, illustrative prices, zero stock. No demo merchandise can be purchased.\n';
for (const p of products) {
  sql += `insert into public.products(id,name,description,category,product_type,color,color_hex,image_url,details,fit,care) values (${[p.id,p.name,p.description,p.category,p.type,p.color,p.colorHex,p.image,JSON.stringify(p.details),p.fit,p.care].map(literal).join(',')}) on conflict(id) do nothing;\n`;
  for (const size of p.sizes) sql += `insert into public.product_variants(product_id,sku,size,price_minor) values(${literal(p.id)},${literal(`TSUYO-${p.id.toUpperCase()}-${size}`)},${literal(size)},${Math.round(p.price*100)}) on conflict(sku) do nothing;\n`;
}
sql += "insert into public.shipping_zones(name,countries,fee_minor,enabled) values('Malaysia — configure before enabling',array['MY'],0,false);\n";
await writeFile(`supabase/migrations/${target}`,sql);
console.log(`Wrote draft catalog: ${products.length} products, ${products.reduce((n,p)=>n+p.sizes.length,0)} size variants.`);
