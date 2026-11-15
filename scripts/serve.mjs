import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { api } from '../worker/api.js';
import { localDb } from './local-db.mjs';
const root = path.resolve(import.meta.dirname, '../dist');
const DB=localDb(path.resolve(import.meta.dirname,'../.sites-runtime/arena.sqlite'));
const animations=JSON.parse(await readFile(path.join(root,'assets/pokemon/manifest.json'),'utf8'));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3':'audio/mpeg', '.wav':'audio/wav' };
const server = http.createServer(async (req, res) => {
  try {
    if(req.url.startsWith('/api/')){const chunks=[];for await(const part of req)chunks.push(part);const request=new Request(`http://127.0.0.1:4173${req.url}`,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});const response=await api(request,{DB},animations);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
    if(req.headers.range){
      const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      const start=range?.[1]?Number(range[1]):Math.max(0,data.length-Number(range?.[2]||0));
      const end=range?.[1]&&range[2]?Math.min(data.length-1,Number(range[2])):data.length-1;
      if(!range||!range[1]&&!range[2]||start>end||start>=data.length){res.writeHead(416,{'Content-Range':`bytes */${data.length}`}).end();return;}
      const bytes=data.subarray(start,end+1);res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':bytes.length}).end(req.method==='HEAD'?undefined:bytes);return;
    }
    res.writeHead(200,{...headers,'Content-Length':data.length});
    res.end(req.method==='HEAD'?undefined:data);
  } catch { res.writeHead(404).end('No encontrado'); }
});
server.listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
