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
// 외부 파일로 불러오면 느린 네트워크에서 기존 자동 로그인(GAS)이 먼저 실행될 수 있어서, 본문에 직접 넣습니다.
const native=await readFile(join(root,'supabase-native.js'),'utf8');
const tag='<script>\n'+native.replace(/<\/script/gi,'<\\/script')+'\n</script>';
const at=html.lastIndexOf('</body>');
if(at<0)throw new Error('index.html body close tag not found');
html=html.slice(0,at)+tag+'\n'+html.slice(at);
await writeFile(join(dist,'index.html'),html,'utf8');
console.log('Yeorin native Supabase build complete');
