const DEFAULT_DESIGN={
 pageTitle:"Wedding RSVP",eyebrow:"TOGETHER WITH THEIR FAMILIES",heading:"You are warmly invited",intro:"Please let us know if you can celebrate with us.",
 guestLabel:"Full name",lookupButton:"Find my invitation",attendanceLabel:"Will you attend?",yesText:"Joyfully accepts",noText:"Regretfully declines",
 companionsLabel:"Names of your companions",companionsHint:"Enter one companion name for each additional seat.",submitButton:"Confirm attendance",
 footerText:"We look forward to celebrating with you.",successMessage:"Thank you! Your RSVP has been recorded.",
 pageBg:"#f7f3eb",cardBg:"#fffdf9",sectionBg:"#f3eee5",textColor:"#39352f",mutedColor:"#82796d",accentColor:"#9a8060",buttonBg:"#75634f",buttonText:"#fffdf9",borderColor:"#e5ded2",
 headingFont:'"Cormorant Garamond", Georgia, serif',bodyFont:'Montserrat, Arial, sans-serif',headingSize:"clamp(2.4rem,8vw,3.5rem)",bodySize:"15px"
};
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
const norm=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
async function sign(value,secret){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value));return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function validAdmin(req,env){const token=(req.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('rsvp_admin='))?.split('=')[1];if(!token)return false;const [exp,sig]=token.split('.');if(!exp||!sig||Number(exp)<Date.now())return false;return (await sign(exp,env.ADMIN_PASSWORD))===sig}
async function body(req){try{return await req.json()}catch{return {}}}
async function getDesign(env){const row=await env.DB.prepare("SELECT value FROM settings WHERE key='design'").first();return row?JSON.parse(row.value):DEFAULT_DESIGN}
async function handle(req,env){
 const url=new URL(req.url),p=url.pathname;
 if(p==='/api/health')return json({ok:true});
 if(p==='/api/design'&&req.method==='GET')return json({design:await getDesign(env)});
 if(p==='/api/lookup'&&req.method==='POST'){
  const b=await body(req),name=String(b.fullName||'').trim();if(name.length<2||name.length>120)return json({error:'Enter your invited full name.'},400);
  const g=await env.DB.prepare('SELECT id,name,seat_allowance FROM guests WHERE name_normalized=?').bind(norm(name)).first();
  if(!g)return json({error:'We could not find that invitation. Please check the spelling or contact the hosts.'},404);
  const existing=await env.DB.prepare('SELECT id FROM rsvps WHERE guest_id=?').bind(g.id).first();
  if(existing)return json({error:'An RSVP has already been submitted for this invitation. Please contact the hosts if you need to make a correction.'},409);
  return json({guest:{id:g.id,name:g.name,seatAllowance:g.seat_allowance}});
 }
 if(p==='/api/rsvp'&&req.method==='POST'){
  const b=await body(req),id=String(b.guestId||''),attending=b.attending===true,companions=Array.isArray(b.companions)?b.companions.map(x=>String(x).trim()):[];
  const g=await env.DB.prepare('SELECT id,name,seat_allowance FROM guests WHERE id=?').bind(id).first();if(!g)return json({error:'Invitation not found. Please look up your name again.'},404);
  if(await env.DB.prepare('SELECT id FROM rsvps WHERE guest_id=?').bind(id).first())return json({error:'An RSVP has already been submitted for this invitation.'},409);
  if(attending){if(companions.length!==g.seat_allowance-1||companions.some(x=>!x||x.length>120))return json({error:`Please provide exactly ${g.seat_allowance-1} companion name(s).`},400);if(new Set(companions.map(norm)).size!==companions.length||companions.some(x=>norm(x)===norm(g.name)))return json({error:'Please enter different, valid companion names.'},400)}
  else if(companions.length)return json({error:'Companion names are not needed when declining.'},400);
  try{await env.DB.prepare('INSERT INTO rsvps (id,guest_id,attending,companions_json,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),id,attending?1:0,JSON.stringify(companions),new Date().toISOString()).run()}catch{return json({error:'An RSVP may already have been submitted. Please contact the hosts if you need help.'},409)}
  return json({ok:true});
 }
 if(p==='/api/admin/login'&&req.method==='POST'){
  const b=await body(req);if(!env.ADMIN_PASSWORD)return json({error:'Admin password secret is not configured.'},500);
  if(String(b.password||'')!==env.ADMIN_PASSWORD)return json({error:'Incorrect password.'},401);
  const exp=String(Date.now()+8*60*60*1000),sig=await sign(exp,env.ADMIN_PASSWORD);
  return json({ok:true},200,{'Set-Cookie':`rsvp_admin=${exp}.${sig}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`});
 }
 if(p.startsWith('/api/admin/')){
  if(!await validAdmin(req,env))return json({error:'Please sign in again.'},401);
  if(p==='/api/admin/logout')return json({ok:true},200,{'Set-Cookie':'rsvp_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});
  if(p==='/api/admin/guests'&&req.method==='GET'){const {results}=await env.DB.prepare('SELECT id,name,seat_allowance FROM guests ORDER BY name').all();return json({guests:results})}
  if(p==='/api/admin/add-guest'&&req.method==='POST'){const b=await body(req),name=String(b.name||'').trim(),n=Number(b.seatAllowance);if(name.length<2||name.length>120||!Number.isInteger(n)||n<1||n>20)return json({error:'Enter a guest name and a seat allowance from 1 to 20.'},400);try{await env.DB.prepare('INSERT INTO guests (id,name,name_normalized,seat_allowance) VALUES (?,?,?,?)').bind(crypto.randomUUID(),name,norm(name),n).run()}catch{return json({error:'That guest name already exists.'},409)}return json({ok:true})}
  if(p==='/api/admin/delete-guest'&&req.method==='POST'){const b=await body(req);await env.DB.prepare('DELETE FROM rsvps WHERE guest_id=?').bind(String(b.id)).run();await env.DB.prepare('DELETE FROM guests WHERE id=?').bind(String(b.id)).run();return json({ok:true})}
  if(p==='/api/admin/responses'&&req.method==='GET'){const {results}=await env.DB.prepare('SELECT g.name,r.attending,r.companions_json,r.created_at FROM rsvps r JOIN guests g ON g.id=r.guest_id ORDER BY r.created_at DESC').all();return json({responses:results.map(x=>({...x,attending:!!x.attending,companions:JSON.parse(x.companions_json||'[]')}))})}
  if(p==='/api/admin/design'&&req.method==='POST'){const b=await body(req),allowed=Object.keys(DEFAULT_DESIGN);const d={...DEFAULT_DESIGN};for(const k of allowed)if(typeof b[k]==='string'&&b[k].length<=500)d[k]=b[k];await env.DB.prepare("INSERT INTO settings (key,value) VALUES ('design',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(d)).run();return json({ok:true})}
  if(p==='/api/admin/reset-design'&&req.method==='POST'){await env.DB.prepare("DELETE FROM settings WHERE key='design'").run();return json({ok:true})}
 }
 return new Response('Not found',{status:404});
}
export async function onRequest({ request, env }) {
  try { return await handle(request, env); }
  catch (e) { return json({ error: 'Server error. Please try again later.' }, 500); }
}
