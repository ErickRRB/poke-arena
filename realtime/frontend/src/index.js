import musicSources from '../../../dist/assets/audio/music/SOURCES.json' with {type:'json'};
const musicSizes=new Map(musicSources.tracks.map(track=>['/assets/audio/music/'+track.file,track.bytes]));

function byteRange(value,size){
 const match=/^bytes=(\d*)-(\d*)$/.exec(value.trim());
 // Unsupported multipart/invalid ranges can be ignored and served normally.
 if(!match||(!match[1]&&!match[2]))return null;
 const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 const end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;
 return start>=size||end<start||size===0?{unsatisfiable:true}:{start,end};
}
function sliceBody(body,start,length){
 const reader=body.getReader();let skip=start,remaining=length;
 const sliced=new ReadableStream({
  async pull(controller){
   try{
    while(remaining>0){
     const {done,value}=await reader.read();
     if(done){controller.error(new Error('Asset ended before its declared range'));return;}
     const offset=Math.min(skip,value.byteLength);skip-=offset;
     const part=value.subarray(offset,offset+remaining);
     if(part.byteLength){remaining-=part.byteLength;controller.enqueue(part);}
     if(remaining===0){controller.close();await reader.cancel();return;}
     if(part.byteLength)return;
    }
   }catch(error){controller.error(error);}
  },
  cancel(reason){return reader.cancel(reason);},
 });
 // Workers sets Content-Length from FixedLengthStream, not a manually set
 // header on an arbitrary stream. pipeThrough preserves cancellation/errors.
 return typeof FixedLengthStream==='function'?sliced.pipeThrough(new FixedLengthStream(length)):sliced;
}
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
  if(request.method==='OPTIONS'&&['GET','HEAD'].includes(request.headers.get('Access-Control-Request-Method'))){
   return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD','Access-Control-Allow-Headers':'Range, If-Range, If-None-Match','Access-Control-Max-Age':'86400'}});
  }
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  const assetUrl=new URL(request.url);if(assetUrl.pathname==='/')assetUrl.pathname='/index.html';
  const assetRequest=new Request(assetUrl,request),musicSize=musicSizes.get(assetUrl.pathname);
  if(musicSize)assetRequest.headers.set('Accept-Encoding','identity');
  const upstream=await env.ASSETS.fetch(assetRequest),headers=new Headers(upstream.headers);
  headers.set('Cache-Control','public, max-age=0, must-revalidate');
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('Access-Control-Allow-Origin','*');
  headers.set('Access-Control-Expose-Headers','Content-Length, Content-Range, Accept-Ranges, ETag');
  // ASSETS may omit Content-Length inside the Worker even when the outer edge
  // response gains it. The imported source manifest pins these exact MP3 bytes.
  const size=Number(headers.get('Content-Length')??musicSize??NaN),range=request.headers.get('Range'),ifRange=request.headers.get('If-Range'),encoding=headers.get('Content-Encoding');
  if(upstream.status===200&&Number.isSafeInteger(size)&&size>=0&&(!encoding||encoding==='identity')){
   if(musicSize)headers.set('Content-Length',String(size));
   headers.set('Accept-Ranges','bytes');
   const etag=headers.get('ETag'),modified=headers.get('Last-Modified');
   const matches=!ifRange||(etag&&!etag.startsWith('W/')&&ifRange===etag)||(modified&&ifRange===modified);
   if(request.method==='GET'&&range&&matches&&upstream.body){
    // The ASSETS binding currently returns the full200 body for Range.
    // Slice its stream here, stopping the source as soon as the range ends.
    const selected=byteRange(range,size);
    if(selected?.unsatisfiable){await upstream.body.cancel();headers.set('Content-Range',`bytes */${size}`);headers.set('Content-Length','0');return new Response(null,{status:416,headers});}
    if(selected){const count=selected.end-selected.start+1;headers.set('Content-Range',`bytes ${selected.start}-${selected.end}/${size}`);headers.set('Content-Length',String(count));return new Response(sliceBody(upstream.body,selected.start,count),{status:206,headers});}
   }
  }
  return new Response(upstream.body,{status:upstream.status,headers});
 },
};
