import fs from 'node:fs';
import {LOADER_BALL_SHAPES} from '../dist/loader-art.js';
let html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
html=html.replace(/<symbol id="i-loading-ball"[\s\S]*?<\/symbol>/,`<symbol id="i-loading-ball" viewBox="0 0 64 64">${LOADER_BALL_SHAPES}</symbol>`);
html=html.replace(/<symbol id="i-ball"[\s\S]*?<\/symbol>/,`<symbol id="i-ball" viewBox="0 0 24 24"><g transform="scale(.375)">${LOADER_BALL_SHAPES}</g></symbol>`);
fs.writeFileSync(new URL('../dist/index.html',import.meta.url),html);
