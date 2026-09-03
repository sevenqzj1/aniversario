/* Funções de domínio independentes da interface, reutilizadas nos testes. */
(function(root){
'use strict';
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const digits=s=>String(s??'').replace(/\D/g,'');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=(tz='America/Sao_Paulo')=>new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const shift=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const days=(a,b)=>Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);
const status=(bill,date=today())=>bill.paid?'pago':bill.due<date?'atrasado':'pendente';
const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
const date=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.split('-').reverse().join('/'):'—';
function categoryPath(id,cats){let seen=new Set(),out=[];while(id){if(seen.has(id))break;seen.add(id);let c=cats.find(c=>c.id===id);if(!c)break;out.unshift(c.name+(c.archived?' (arquivada)':''));id=c.parent;}return out.join(' / ');}
function inCategory(id,parent,cats){const seen=new Set();while(id&&!seen.has(id)){if(id===parent)return true;seen.add(id);id=cats.find(c=>c.id===id)?.parent;}return false;}
function validParent(id,parent,cats){let seen=new Set([id]),depth=1;while(parent){if(seen.has(parent))return false;seen.add(parent);let c=cats.find(c=>c.id===parent);if(!c||c.archived)return false;depth++;parent=c.parent;}if(depth>3)return false;const descendants=(node,visited=new Set())=>{if(visited.has(node))return 99;let v=new Set(visited);v.add(node);return Math.max(0,...cats.filter(c=>c.parent===node).map(c=>1+descendants(c.id,v)));};return depth+descendants(id)<=3;}
function matches(client,bill,f,state){
 const q=normalize(f.q), phone=digits(f.q);
 if(q && !normalize(client.name).includes(q) && !(phone.length && digits(client.whatsapp).includes(phone)))return false;
 const has=(key,val)=>!f[key]?.length||f[key].includes(val);
 if(!has('plan',client.plan)||!has('owner',client.owner)||!has('status',status(bill,state.today)))return false;
 if(f.tags?.length&&!f.tags.some(id=>client.tags.includes(id)))return false;
 if(f.category && !inCategory(client.category,f.category,state.categories))return false;
 if(f.from&&bill.due<f.from||f.to&&bill.due>f.to)return false;
 if(f.active!=='all' && !client.active)return false;
 if(f.queue && bill.paid)return false;
 if(f.queue==='today'&&bill.due!==state.today)return false;
 if(f.queue==='tomorrow'&&bill.due!==shift(state.today,1))return false;
 if(f.queue==='late'&&bill.due>=state.today)return false;
 if(f.queue==='no-contact'&&state.messages.some(m=>m.clientId===client.id&&['sent','delivered','read'].includes(m.status)&&m.at.slice(0,10)>=shift(state.today,-7)))return false;
 return true;
}
function filtered(state,f={}){return state.bills.filter(b=>{let c=state.clients.find(c=>c.id===b.clientId);return c&&matches(c,b,f,state);}).sort((a,b)=>f.sort==='value'?b.amount-a.amount||a.id.localeCompare(b.id):f.sort==='name'?state.clients.find(c=>c.id===a.clientId).name.localeCompare(state.clients.find(c=>c.id===b.clientId).name,'pt-BR')||a.id.localeCompare(b.id):a.due.localeCompare(b.due)||a.id.localeCompare(b.id));}
function message(client,bill,template){const fields={nome:client.name.split(' ')[0],plano:bill.plan||client.plan,valor:money(bill.amount),vencimento:date(bill.due)};return template.replace(/\{(nome|plano|valor|vencimento)\}/g,(_,k)=>fields[k]);}
root.Core={normalize,digits,escape,today,shift,days,status,money,date,categoryPath,validParent,filtered,message};
})(typeof window!=='undefined'?window:globalThis);