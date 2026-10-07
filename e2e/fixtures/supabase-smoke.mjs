// Test-only loopback stub. Never import this file from src/ or deploy it as an API.
import { createServer } from 'node:http';
if (process.env.BEANMORA_SMOKE !== '1' || process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54329') throw Error('Refusing non-local smoke configuration');
const user = {id:'00000000-0000-4000-8000-000000000099',aud:'authenticated',role:'authenticated',is_anonymous:true,app_metadata:{provider:'anonymous',providers:['anonymous']},user_metadata:{},identities:[],created_at:'2026-01-01T00:00:00Z'};
const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const access_token = `${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:user.id,aud:'authenticated',role:'authenticated',is_anonymous:true,exp:Math.floor(Date.now()/1000)+3600})}.test-only-not-a-valid-signature`;
const server = createServer((req,res) => {
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:3000');
  // PostgREST sends the selected schema on browser reads and writes. WebKit
  // correctly rejects a preflight when these headers are absent.
  res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,accept-profile,content-profile,prefer,x-client-info,x-supabase-api-version');
  res.setHeader('Access-Control-Allow-Methods','GET,HEAD,POST,OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const requestUrl=new URL(req.url,'http://127.0.0.1:54329');
  const path=requestUrl.pathname;
  if(path==='/health'){res.end('{}');return;}
  if(['/auth/v1/signup','/auth/v1/token'].includes(path) && req.method==='POST') {
    // Simulates isolated guest/password auth only. No real user, catalog item or brew is created.
    res.end(JSON.stringify({access_token,token_type:'bearer',expires_in:3600,refresh_token:'test-only-refresh',user}));return;
  }
  if(path==='/auth/v1/user' && req.headers.authorization===`Bearer ${access_token}`){res.end(JSON.stringify(user));return;}
  if(['/rest/v1/rpc/search_public_beans','/rest/v1/rpc/search_public_recipes'].includes(path) && req.method==='POST'){res.setHeader('Content-Range','*/0');res.end('[]');return;}
  const detailId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  if(path==='/rest/v1/coffee_comments' && req.method==='GET' && requestUrl.searchParams.get('bean_id')===`eq.${detailId}`){
    res.end(JSON.stringify([{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',body:'Bilingual coffee comment fixture',created_at:'2026-01-01T00:00:00Z',author:{name:'Fixture Barista',username:'fixture_barista'}}]));return;
  }
  const selected=requestUrl.searchParams.get('id')===`eq.${detailId}`;
  const detail=path==='/rest/v1/beans' && requestUrl.searchParams.get('slug')==='eq.locale-fixture' ? {id:detailId,slug:'locale-fixture',name_ar:'بن اختبار اللغة',name_en:'Locale test coffee',description_ar:'وصف البن بالعربية',description_en:'English coffee description',roaster:null,flavors:[],images:[]} : selected && path==='/rest/v1/recipes' ? {id:detailId,title:'Locale test recipe',title_ar:'وصفة اختبار اللغة',brew_method:'v60',recipe_type:'community',visibility:'public',dose_grams:15,water_grams:250,created_at:'2026-01-01',flavor_notes:[],steps:[{id:detailId,step_number:1,title:'Bloom',title_ar:'التزهير',description:'Pour water',description_ar:'صب الماء'}],equipment:[],sources:[],pours:[]} : selected && path==='/rest/v1/equipment_models' ? {id:detailId,name:'Locale test grinder',category:'grinder',specifications:{catalog:{name_ar:'طاحونة اختبار اللغة',description_ar:'وصف الطاحونة بالعربية',description_en:'English grinder description'}},suitable_brew_methods:[]} : null;
  if(detail && req.method==='GET'){res.setHeader('Content-Range','0-0/1');res.end(JSON.stringify(req.headers.accept?.includes('application/vnd.pgrst.object+json')?detail:[detail]));return;}
  if(path.startsWith('/rest/v1/') && ['GET','HEAD'].includes(req.method)){
    res.setHeader('Content-Range','*/0');
    res.end(req.headers.accept?.includes('application/vnd.pgrst.object+json')?'null':'[]');return;
  }
  res.writeHead(403);res.end(JSON.stringify({code:'smoke_denied',message:'Test stub rejects this operation'}));
});
server.listen(54329,'127.0.0.1');
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>process.exit(0)));
