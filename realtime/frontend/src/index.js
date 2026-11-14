const LEGACY_SITE='https://poke-arena-erick.eriqrb.chatgpt.site';
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/')){
   const origin=request.headers.get('origin');
   if(origin&&origin!==url.origin&&origin!==LEGACY_SITE)return new Response('Origin not allowed',{status:403});
   const proxy=new Request(LEGACY_SITE+url.pathname+url.search,request);
   if(origin)proxy.headers.set('Origin',LEGACY_SITE);
   const upstream=await fetch(proxy),headers=new Headers(upstream.headers);
   if(origin)headers.set('Access-Control-Allow-Origin',origin);
   return new Response(upstream.body,{status:upstream.status,headers});
  }
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  const assetUrl=new URL(request.url);if(assetUrl.pathname==='/')assetUrl.pathname='/index.html';
  const upstream=await env.ASSETS.fetch(new Request(assetUrl,request)),headers=new Headers(upstream.headers);
  headers.set('Cache-Control','public, max-age=0, must-revalidate');
  headers.set('X-Content-Type-Options','nosniff');
  return new Response(upstream.body,{status:upstream.status,headers});
 },
};
