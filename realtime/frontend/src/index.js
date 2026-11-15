export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api'||url.pathname.startsWith('/api/')){
   // Current clients use the Cloudflare WebSocket service. Old HTTP clients
   // must reload instead of forwarding their session or actions to Sites.
   return new Response(request.method==='HEAD'?null:JSON.stringify({code:'legacy_api_retired',error:'Esta versión del modo online fue retirada. Actualizá la página para conectar.',updateRequired:true}),{
    status:410,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},
   });
  }
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  const assetUrl=new URL(request.url);if(assetUrl.pathname==='/')assetUrl.pathname='/index.html';
  const upstream=await env.ASSETS.fetch(new Request(assetUrl,request)),headers=new Headers(upstream.headers);
  headers.set('Cache-Control','public, max-age=0, must-revalidate');
  headers.set('X-Content-Type-Options','nosniff');
  return new Response(upstream.body,{status:upstream.status,headers});
 },
};
