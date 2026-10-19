const encoder=new TextEncoder();
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const fail=(message,status=400)=>json({error:message},status);
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const digest=async x=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(x)));
const random=()=>crypto.randomUUID();
async function passHash(pass,salt=random()){const key=await crypto.subtle.importKey('raw',encoder.encode(pass),'PBKDF2',false,['deriveBits']);const result=await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:210000,hash:'SHA-256'},key,256);return salt+':'+hex(result)}
async function verify(pass,stored){if(!stored||!stored.includes(':'))return false;const expected=await passHash(pass,stored.split(':')[0]);let x=0;for(let i=0;i<Math.max(expected.length,stored.length);i++)x|=(expected.charCodeAt(i)||0)^(stored.charCodeAt(i)||0);return x===0}
const cookie=(token,maxAge=604800)=>`pratico_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
async function adminSignature(secret, payload){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),'HMAC',{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(payload)))}
async function adminFromCookie(ctx){const secret=ctx.env.ADMIN_PASSWORD;if(!secret)return null;const raw=(ctx.request.headers.get('cookie')||'').match(/(?:^|;\s*)pratico_admin=([^;]+)/)?.[1];if(!raw)return null;const [expires,sig]=raw.split('.');if(!/^\d{10,13}$/.test(expires||'')||Number(expires)<Date.now()||Number(expires)>Date.now()+86400000||!sig)return null;const expected=await adminSignature(secret,expires);if(sig.length!==expected.length)return null;let diff=0;for(let i=0;i<sig.length;i++)diff|=sig.charCodeAt(i)^expected.charCodeAt(i);return diff===0?{id:'admin',email:'Amministratore PRATICO',role:'admin'}:null}
async function current(ctx){const token=(ctx.request.headers.get('cookie')||'').match(/(?:^|;\s*)pratico_session=([^;]+)/)?.[1];if(!token)return null;const hash=await digest(token);return ctx.env.DB.prepare('SELECT u.id,u.email,u.role,u.stripe_customer_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(hash,Math.floor(Date.now()/1000)).first()}
async function premium(ctx,user){if(!user)return false;const r=await ctx.env.DB.prepare("SELECT 1 AS ok FROM subscriptions WHERE user_id=? AND status IN ('active','trialing') AND (period_end IS NULL OR period_end>?) LIMIT 1").bind(user.id,Math.floor(Date.now()/1000)).first();return !!r}
async function body(ctx){const len=Number(ctx.request.headers.get('content-length')||0);if(len>150000)return null;try{const raw=await ctx.request.text();if(raw.length>150000)return null;return JSON.parse(raw)}catch{return null}}
async function stripe(ctx,route,method='POST',data={}){const b=new URLSearchParams(data);const response=await fetch('https://api.stripe.com/v1/'+route,{method,headers:{authorization:'Bearer '+ctx.env.STRIPE_SECRET_KEY,'content-type':'application/x-www-form-urlencoded'},body:b});const result=await response.json();if(!response.ok)throw Error(result.error?.message||'Stripe error');return result}
async function signedWebhook(payload,header,secret){const fields=Object.fromEntries((header||'').split(',').map(x=>x.split('=')));const ts=Number(fields.t);if(!ts||Math.abs(Date.now()/1000-ts)>300)return false;const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=hex(await crypto.subtle.sign('HMAC',key,encoder.encode(ts+'.'+payload)));const provided=(header||'').split(',').filter(x=>x.startsWith('v1=')).map(x=>x.slice(3));return provided.some(s=>s.length===sig.length&&s.split('').reduce((v,c,i)=>v|(c.charCodeAt(0)^sig.charCodeAt(i)),0)===0)}
const sameOrigin=req=>{const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin};
export async function onRequest(ctx){const {request,env}=ctx;const url=new URL(request.url),path=url.pathname.replace(/^\/api\/?/,'').replace(/\/$/,'');const method=request.method;
try{
if(!env.DB)return fail('Database D1 non configurato',503);
if(path==='stripe/webhook'&&method==='POST'){
 if(!env.STRIPE_WEBHOOK_SECRET)return fail('Webhook non configurato',503);const raw=await request.text();if(!await signedWebhook(raw,request.headers.get('stripe-signature'),env.STRIPE_WEBHOOK_SECRET))return fail('Firma non valida',400);
 const event=JSON.parse(raw);const prior=await env.DB.prepare('SELECT id FROM webhook_events WHERE id=?').bind(event.id).first();if(prior)return json({ok:true});const obj=event.data?.object||{};
 if(event.type==='checkout.session.completed'&&obj.mode==='subscription'){
  const userId=obj.client_reference_id;const user=await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(userId).first();if(user&&obj.customer)await env.DB.prepare('UPDATE users SET stripe_customer_id=? WHERE id=?').bind(obj.customer,userId).run();
 }
 if(event.type.startsWith('customer.subscription.')){
  const u=await env.DB.prepare('SELECT id FROM users WHERE stripe_customer_id=?').bind(obj.customer).first() || (obj.metadata?.pratico_user_id ? await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(obj.metadata.pratico_user_id).first() : null);if(u)await env.DB.prepare('INSERT INTO subscriptions(id,user_id,customer_id,status,period_end) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,period_end=excluded.period_end,updated_at=CURRENT_TIMESTAMP').bind(obj.id,u.id,obj.customer,obj.status,obj.current_period_end||null).run();
 }
 await env.DB.prepare('INSERT INTO webhook_events(id) VALUES(?)').bind(event.id).run();return json({ok:true});
}
if(method!=='GET'&&!sameOrigin(request))return fail('Origine non autorizzata',403);

if(path==='site/config'&&method==='GET'){
 const r=await env.DB.prepare("SELECT key,value FROM site_settings WHERE key IN ('ads_enabled','ads_placement','ads_html','regional_factors','estimator_notice')").all();
 const values=Object.fromEntries((r.results||[]).map(x=>[x.key,x.value]));
 return json({adsEnabled:values.ads_enabled==='true',adsPlacement:values.ads_placement||'inline',adsHtml:values.ads_html||'',regionalFactors:JSON.parse(values.regional_factors||'{}'),estimatorNotice:values.estimator_notice||''});
}
if(path==='admin/settings'&&method==='GET'){
 if(!await adminFromCookie(ctx))return fail('Accesso amministratore richiesto',403);
 const r=await env.DB.prepare('SELECT key,value FROM site_settings ORDER BY key').all();return json({items:r.results||[]});
}
if(path==='admin/settings'&&method==='POST'){
 if(!await adminFromCookie(ctx))return fail('Accesso amministratore richiesto',403);
 const b=await body(ctx);const allowed=['ads_enabled','ads_placement','ads_html','regional_factors','estimator_notice'];
 if(!b||!allowed.includes(b.key)||typeof b.value!=='string'||b.value.length>12000)return fail('Impostazione non valida');
 if(b.key==='ads_enabled'&&!['true','false'].includes(b.value))return fail('Valore non valido');
 if(b.key==='ads_placement'&&!['inline','popup','both','off'].includes(b.value))return fail('Posizione non valida');
 if(b.key==='regional_factors'){
  let f;try{f=JSON.parse(b.value)}catch{return fail('JSON non valido')}
  if(!f||typeof f!=='object'||Array.isArray(f)||Object.keys(f).length>25||Object.values(f).some(x=>typeof x!=='number'||x<0.5||x>2))return fail('Coefficienti ammessi tra 0,5 e 2');
 }
 if(b.key==='ads_html'&&b.value.trim())return fail('Per sicurezza non è consentito salvare HTML pubblicitario arbitrario: configura gli ID AdSense come segreti e usa gli slot predefiniti.');
 await env.DB.prepare('INSERT INTO site_settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP').bind(b.key,b.value).run();return json({ok:true});
}
if(path==='admin/users'&&method==='GET'){
 if(!await adminFromCookie(ctx))return fail('Accesso amministratore richiesto',403);
 const r=await env.DB.prepare('SELECT u.id,u.email,u.role,u.created_at,MAX(s.status) subscription_status FROM users u LEFT JOIN subscriptions s ON s.user_id=u.id GROUP BY u.id ORDER BY u.created_at DESC LIMIT 200').all();return json({items:r.results||[]});
}
if(path==='admin/quotes'&&method==='GET'){
 if(!await adminFromCookie(ctx))return fail('Accesso amministratore richiesto',403);
 const r=await env.DB.prepare('SELECT q.id,u.email,q.created_at,q.updated_at FROM quotes q JOIN users u ON u.id=q.user_id ORDER BY q.updated_at DESC LIMIT 200').all();return json({items:r.results||[]});
}
if(path==='admin/prices'&&method==='GET'){
 if(!await adminFromCookie(ctx))return fail('Accesso amministratore richiesto',403);
 const r=await env.DB.prepare('SELECT id,region,category,code,description,unit,amount FROM price_items ORDER BY region,category LIMIT 200').all();return json({items:r.results||[]});
}

if(path==='config'&&method==='GET')return json({adsenseClient:env.ADSENSE_CLIENT_ID||'',adsenseSlot:env.ADSENSE_SLOT||'',paymentsEnabled:!!(env.STRIPE_SECRET_KEY&&env.STRIPE_PRICE_ID)});
if(path==='admin/login'&&method==='POST'){
 const secret=String(env.ADMIN_PASSWORD||'');if(!secret)return fail('Configura ADMIN_PASSWORD nei segreti Cloudflare Pages.',503);
 const b=await body(ctx),provided=String(b?.password||'');if(provided.length>512)return fail('Credenziali non valide',401);
 // Constant-time comparison of digests; configure Cloudflare rate limiting on /api/admin/login.
 const a=await digest(provided),z=await digest(secret);let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^z.charCodeAt(i);if(diff)return fail('Password amministratore non valida',401);
 const expires=String(Date.now()+8*3600000),signature=await adminSignature(secret,expires);
 return json({ok:true},200,{'set-cookie':`pratico_admin=${expires}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=28800`});
}
if(path==='auth/register'&&method==='POST'){
 const b=await body(ctx);const email=String(b?.email||'').trim().toLowerCase(),password=String(b?.password||'');if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||password.length<12||password.length>200)return fail('Email valida e password di almeno 12 caratteri richieste');
 const exists=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();if(exists)return fail('Account già presente',409);
 const id=random(),role=email===String(env.ADMIN_EMAIL||'').toLowerCase()?'admin':'user';await env.DB.prepare('INSERT INTO users(id,email,password_hash,role) VALUES(?,?,?,?)').bind(id,email,await passHash(password),role).run();return json({ok:true},201);
}
if(path==='auth/login'&&method==='POST'){
 const b=await body(ctx),email=String(b?.email||'').trim().toLowerCase();const u=await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first();if(!u||!await verify(String(b?.password||''),u.password_hash))return fail('Credenziali non valide',401);
 const token=random()+random(),hash=await digest(token);await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(hash,u.id,Math.floor(Date.now()/1000)+604800).run();return json({ok:true,email:u.email,role:u.role},200,{'set-cookie':cookie(token)});
}
const user=await current(ctx);
if(path==='auth/me'&&method==='GET'){const admin=await adminFromCookie(ctx);return json({user:user?{email:user.email,role:user.role}:admin?{email:admin.email,role:'admin'}:null,premium:await premium(ctx,user),admin:!!admin});}
if(path==='auth/logout'&&method==='POST'){
 const token=(request.headers.get('cookie')||'').match(/(?:^|;\s*)pratico_session=([^;]+)/)?.[1];
 if(token)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();
 const headers=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store'});headers.append('set-cookie',cookie('',0));headers.append('set-cookie','pratico_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0');return new Response(JSON.stringify({ok:true}),{headers});
}
if(path==='admin/logout'&&method==='POST')return json({ok:true},200,{'set-cookie':'pratico_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0'});

if(path==='prices'&&method==='GET'){
 const region=(url.searchParams.get('region')||'').trim(),category=(url.searchParams.get('category')||'').trim(),q=(url.searchParams.get('q')||'').trim();if(!region||region.length>100||category.length>80||q.length>80)return fail('Regione obbligatoria');
 const rows=await env.DB.prepare("SELECT p.code,p.description,p.unit,p.amount,p.region,p.province,p.city,p.category,s.title source,s.publisher,s.edition,s.url,s.license,s.verified_at FROM price_items p JOIN price_sources s ON p.source_id=s.id WHERE s.active=1 AND p.region=? AND (?='' OR p.category=?) AND (?='' OR p.description LIKE ? OR p.code LIKE ?) ORDER BY p.category,p.description LIMIT 60").bind(region,category,category,q,'%'+q+'%','%'+q+'%').all();return json({items:rows.results||[],note:'Prezzi di riferimento da fonti dichiarate; non tariffe private né adeguamenti automatici generici.'});
}
if(path==='quotes'&&method==='GET'){
 if(!user)return fail('Accedi per sincronizzare i preventivi',401);if(!await premium(ctx,user))return fail('Archivio cloud riservato a Premium',403);
 const r=await env.DB.prepare('SELECT id,payload,created_at,updated_at FROM quotes WHERE user_id=? ORDER BY updated_at DESC LIMIT 100').bind(user.id).all();return json({items:(r.results||[]).map(x=>({...x,payload:JSON.parse(x.payload)}))});
}
if(path==='quotes'&&method==='POST'){
 if(!user)return fail('Accesso richiesto',401);if(!await premium(ctx,user))return fail('Premium richiesto',403);const b=await body(ctx);if(!b||!Array.isArray(b.lines)||!b.lines.length||b.lines.length>150||JSON.stringify(b).length>100000||b.lines.some(x=>typeof x.desc!=='string'||x.desc.length>500||!Number.isFinite(Number(x.qty))||Number(x.qty)<0||!Number.isFinite(Number(x.unit))||Number(x.unit)<0))return fail('Preventivo non valido');const id=random();await env.DB.prepare('INSERT INTO quotes(id,user_id,payload) VALUES(?,?,?)').bind(id,user.id,JSON.stringify(b)).run();return json({id},201);
}
if(path.startsWith('quotes/')&&method==='DELETE'){
 if(!user)return fail('Accesso richiesto',401);if(!await premium(ctx,user))return fail('Premium richiesto',403);await env.DB.prepare('DELETE FROM quotes WHERE id=? AND user_id=?').bind(path.slice(7),user.id).run();return json({ok:true});
}
if(path==='billing/checkout'&&method==='POST'){
 if(!user)return fail('Accedi prima di acquistare',401);if(!env.STRIPE_SECRET_KEY||!env.STRIPE_PRICE_ID)return fail('Pagamenti non configurati',503);const hasSubscription=await premium(ctx,user);if(hasSubscription)return fail('Hai già un abbonamento Premium: gestiscilo dal portale.',409);const data={'mode':'subscription','line_items[0][price]':env.STRIPE_PRICE_ID,'line_items[0][quantity]':'1','success_url':url.origin+'/?checkout=success','cancel_url':url.origin+'/?checkout=cancel','client_reference_id':user.id,'subscription_data[metadata][pratico_user_id]':user.id};if(user.stripe_customer_id)data.customer=user.stripe_customer_id;else data.customer_email=user.email;const session=await stripe(ctx,'checkout/sessions','POST',data);return json({url:session.url});
}
if(path==='billing/portal'&&method==='POST'){
 if(!user?.stripe_customer_id)return fail('Nessun abbonamento trovato',404);if(!env.STRIPE_SECRET_KEY)return fail('Pagamenti non configurati',503);const session=await stripe(ctx,'billing_portal/sessions','POST',{customer:user.stripe_customer_id,return_url:url.origin+'/'});return json({url:session.url});
}
if(path==='admin/stats'&&method==='GET'){
 if(!await adminFromCookie(ctx))return fail('Accesso amministratore richiesto',403);
 const [users,quotes,subs,sources,prices]=await Promise.all(['users','quotes','subscriptions','price_sources','price_items'].map(t=>env.DB.prepare('SELECT COUNT(*) AS n FROM '+t).first()));return json({users:users.n,quotes:quotes.n,subscriptions:subs.n,sources:sources.n,prices:prices.n});
}
if(path==='admin/prices/import'&&method==='POST'){
 if(!await adminFromCookie(ctx))return fail('Accesso amministratore richiesto',403);const b=await body(ctx);if(!b?.source||!Array.isArray(b.items)||b.items.length>100||!b.items.length)return fail('Formato non valido o massimo 100 voci per richiesta');
 const s=b.source;if(!s.id||!s.title||!/^https:\/\//.test(s.url||'')||!s.publisher||!s.edition||!s.license||!s.verified_at)return fail('Metadati fonte obbligatori: id, titolo, URL HTTPS, editore, edizione, licenza, data verifica');
 const stmts=[env.DB.prepare('INSERT INTO price_sources(id,title,url,publisher,edition,license,verified_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,url=excluded.url,publisher=excluded.publisher,edition=excluded.edition,license=excluded.license,verified_at=excluded.verified_at').bind(s.id,s.title,s.url,s.publisher,s.edition,s.license,s.verified_at)];
 for(const i of b.items){if(!i.region||!i.category||!i.code||!i.description||!i.unit||!Number.isFinite(Number(i.amount))||Number(i.amount)<0)return fail('Voce prezzo non valida');stmts.push(env.DB.prepare('INSERT INTO price_items(id,source_id,region,province,city,category,code,description,unit,amount) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source_id,region,code,city) DO UPDATE SET amount=excluded.amount,description=excluded.description,unit=excluded.unit').bind(random(),s.id,i.region,i.province||null,i.city||'',i.category,i.code,i.description,i.unit,Number(i.amount)))}
 await env.DB.batch(stmts);return json({ok:true,imported:b.items.length});
}
return fail('Endpoint inesistente',404);
}catch(err){console.error('PRATICO API:',err);return fail('Errore del server. Controlla configurazione e log.',500)}
}
