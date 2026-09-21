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
  res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version');
  res.setHeader('Access-Control-Allow-Methods','GET,HEAD,POST,OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const path=new URL(req.url,'http://127.0.0.1:54329').pathname;
  if(path==='/health'){res.end('{}');return;}
  if(path==='/auth/v1/signup' && req.method==='POST') {
    // Simulates guest auth only. No real user, catalog item or brew is created.
    res.end(JSON.stringify({access_token,token_type:'bearer',expires_in:3600,refresh_token:'test-only-refresh',user}));return;
  }
  if(path==='/auth/v1/user' && req.headers.authorization===`Bearer ${access_token}`){res.end(JSON.stringify(user));return;}
  if(path.startsWith('/rest/v1/') && ['GET','HEAD'].includes(req.method)){
    res.setHeader('Content-Range','*/0');
    res.end(req.headers.accept?.includes('application/vnd.pgrst.object+json')?'null':'[]');return;
  }
  res.writeHead(403);res.end(JSON.stringify({code:'smoke_denied',message:'Test stub rejects this operation'}));
});
server.listen(54329,'127.0.0.1');
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>process.exit(0)));
