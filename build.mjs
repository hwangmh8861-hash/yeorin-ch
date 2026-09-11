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
    else if(!['index.html','build.mjs','package.json','vercel.json','ui-patch.mjs','date-speed-patch.mjs','supabase-native.js','gas-zero-patch.js','community.js'].includes(name))await copyFile(from,to);
  }
}
await copyDir(root,dist);

let html=await readFile(join(root,'index.html'),'utf8');

// 운영 번들에서는 기존 Google Apps Script 연결을 완전히 제거합니다.
html=html.replace(/<!-- GAS API URL -->\s*<script>[\s\S]*?<\/script>\s*/,'');
html=html.replace(/function gas\(fn,\.\.\.a\)\{[\s\S]*?\n\}\n(?=\n)/,'');
if(html.includes('script.google.com/macros/s/'))throw new Error('Legacy GAS URL is still present in index.html');
if(html.includes('function gas(fn,...a){'))throw new Error('Legacy gas() transport is still present in index.html');

// 설치형 PWA의 최상단 상태바를 hero와 자연스럽게 이어지게 합니다.
// iOS에서는 theme-color만으로 임의 색상 상태바를 만들 수 없어서
// black-translucent로 콘텐츠를 상태바 뒤까지 확장하고 safe-area만큼 hero 여백을 확보합니다.
html=html.replace(
  /<meta name="apple-mobile-web-app-status-bar-style" content="[^"]*">/,
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
);
html=html.replace(
  /<meta name="theme-color" content="[^"]*">/,
  '<meta name="theme-color" content="#2F6B47">'
);

// 여린이 AI 응답 카드 UI 보정 + PWA 상단 safe-area 보정
const yeorinUiPatch=`<style id="yeorin-ui-hotfix">
html{background:#2F6B47!important;}
.hero{padding-top:calc(12px + env(safe-area-inset-top))!important;}
[id^="yeorin"] [style*="border-left"]{border-left:none!important;}
#yeorinQT .yeorin-img-lg,#yeorinBible .yeorin-img-lg{height:120px!important;width:auto!important;max-width:none!important;object-fit:contain!important;margin-right:14px!important;}
#yeorinQT .card>div:first-child,#yeorinBible .card>div:first-child{gap:14px!important;margin-bottom:14px!important;}
[id^="yeorinPr-"] .yeorin-img{height:90px!important;width:auto!important;max-width:none!important;object-fit:contain!important;margin-right:10px!important;}
</style>`;
const headAt=html.lastIndexOf('</head>');
if(headAt<0)throw new Error('index.html head close tag not found');
html=html.slice(0,headAt)+yeorinUiPatch+'\n'+html.slice(headAt);

// 네이티브 Supabase 엔진과 UI 패치를 본문에 직접 삽입합니다.
const native=await readFile(join(root,'supabase-native.js'),'utf8');
const gasZero=await readFile(join(root,'gas-zero-patch.js'),'utf8');
const community=await readFile(join(root,'community.js'),'utf8');
const inline=[native,gasZero,community].map(code=>code.replace(/<\/script/gi,'<\\/script')).join('\n\n');
const tag='<script>\n'+inline+'\n</script>';
const at=html.lastIndexOf('</body>');
if(at<0)throw new Error('index.html body close tag not found');
html=html.slice(0,at)+tag+'\n'+html.slice(at);
await writeFile(join(dist,'index.html'),html,'utf8');
console.log('Yeorin Supabase-only build complete');
