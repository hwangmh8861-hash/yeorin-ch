import { readFile, writeFile, mkdir, readdir, copyFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root=process.cwd();
const dist=join(root,'dist');
await mkdir(dist,{recursive:true});

async function copyDir(src,dst){
  await mkdir(dst,{recursive:true});
  for(const name of await readdir(src)){
    if(['.git','dist','node_modules'].includes(name))continue;
    const from=join(src,name),to=join(dst,name),info=await stat(from);
    if(info.isDirectory())await copyDir(from,to);
    else if(!['index.html','build.mjs','package.json','vercel.json','ui-patch.mjs','date-speed-patch.mjs'].includes(name))await copyFile(from,to);
  }
}
await copyDir(root,dist);

let html=await readFile(join(root,'index.html'),'utf8');
const tag='<script src="/supabase-native.js?v=20260911-1"></script>';
if(!html.includes(tag)){
  if(!html.includes('</body>'))throw new Error('index.html body close tag not found');
  html=html.replace('</body>',tag+'\n</body>');
}
await writeFile(join(dist,'index.html'),html,'utf8');
console.log('Yeorin native Supabase build complete');
