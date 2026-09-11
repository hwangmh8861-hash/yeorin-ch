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
    else if(!['index.html','build.mjs','package.json','vercel.json','ui-patch.mjs','date-speed-patch.mjs','supabase-native.js','gas-zero-patch.js'].includes(name))await copyFile(from,to);
  }
}
await copyDir(root,dist);

let html=await readFile(join(root,'index.html'),'utf8');

// 운영 번들에서는 기존 Google Apps Script 연결을 완전히 제거합니다.
html=html.replace(/<!-- GAS API URL -->\s*<script>[\s\S]*?<\/script>\s*/,'');
html=html.replace(/function gas\(fn,\.\.\.a\)\{[\s\S]*?\n\}\n(?=\n)/,'');
if(html.includes('script.google.com/macros/s/'))throw new Error('Legacy GAS URL is still present in index.html');
if(html.includes('function gas(fn,...a){'))throw new Error('Legacy gas() transport is still present in index.html');

// 여린이 AI 응답 카드 UI 보정
// - 기존 왼쪽 초록 세로선 제거
// - 결과 카드의 여린이 캐릭터를 정확히 3배 확대(40px → 120px)
const yeorinUiPatch=`<style id="yeorin-ui-hotfix">
[id^="yeorin"] [style*="border-left"]{border-left:none!important;}
#yeorinQT .yeorin-img-lg,#yeorinBible .yeorin-img-lg{height:120px!important;width:auto!important;max-width:none!important;object-fit:contain!important;margin-right:14px!important;}
#yeorinQT .card>div:first-child,#yeorinBible .card>div:first-child{gap:14px!important;margin-bottom:14px!important;}
[id^="yeorinPr-"] .yeorin-img{height:90px!important;width:auto!important;max-width:none!important;object-fit:contain!important;margin-right:10px!important;}
</style>`;
const headAt=html.lastIndexOf('</head>');
if(headAt<0)throw new Error('index.html head close tag not found');
html=html.slice(0,headAt)+yeorinUiPatch+'\n'+html.slice(headAt);

// 네이티브 Supabase 엔진과 GAS-zero 패치를 본문에 직접 삽입합니다.
const native=await readFile(join(root,'supabase-native.js'),'utf8');
const gasZero=await readFile(join(root,'gas-zero-patch.js'),'utf8');
const inline=[native,gasZero].map(code=>code.replace(/<\/script/gi,'<\\/script')).join('\n\n');
const tag='<script>\n'+inline+'\n</script>';
const at=html.lastIndexOf('</body>');
if(at<0)throw new Error('index.html body close tag not found');
html=html.slice(0,at)+tag+'\n'+html.slice(at);
await writeFile(join(dist,'index.html'),html,'utf8');
console.log('Yeorin Supabase-only build complete');
