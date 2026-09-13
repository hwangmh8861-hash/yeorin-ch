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
    else if(!['index.html','build.mjs','package.json','vercel.json','ui-patch.mjs','date-speed-patch.mjs','supabase-native.js','gas-zero-patch.js','community.js','community-image-fix.js','community-editor-fix.js','app-ux-fix.js','pwa-update.js','exit-hint-timeout.js','nanum-time-fix.js','notification-push.js','nanum-v2.js','bible-provider.js','bible-reader.js','bible-back-fix.js','bible-progress-sync-fix.js','nanum-v2-compose-fix.js','nanum-range-patch.js','nanum-range-open-ended-fix.js','addressbook-fix.js','avatar.js','social-feed.js','challenge-reminder-ui.js','challenge-push-nav.js'].includes(name))await copyFile(from,to);
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
html=html.replace(
  /<meta name="apple-mobile-web-app-status-bar-style" content="[^"]*">/,
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
);
html=html.replace(
  /<meta name="theme-color" content="[^"]*">/,
  '<meta name="theme-color" content="#2F6B47">'
);

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
const communityEditor=await readFile(join(root,'community-editor-fix.js'),'utf8');
const bibleBack=await readFile(join(root,'bible-back-fix.js'),'utf8');
const appUx=await readFile(join(root,'app-ux-fix.js'),'utf8');
const pwaUpdate=await readFile(join(root,'pwa-update.js'),'utf8');
const exitHint=await readFile(join(root,'exit-hint-timeout.js'),'utf8');
const nanumTime=await readFile(join(root,'nanum-time-fix.js'),'utf8');
const push=await readFile(join(root,'notification-push.js'),'utf8');
const bibleProvider=await readFile(join(root,'bible-provider.js'),'utf8');
const bibleReader=await readFile(join(root,'bible-reader.js'),'utf8');
const bibleProgressSync=await readFile(join(root,'bible-progress-sync-fix.js'),'utf8');
const nanumV2=await readFile(join(root,'nanum-v2.js'),'utf8');
const nanumV2ComposeFix=await readFile(join(root,'nanum-v2-compose-fix.js'),'utf8');
const nanumRangePatch=await readFile(join(root,'nanum-range-patch.js'),'utf8');
const nanumRangeOpenEndedFix=await readFile(join(root,'nanum-range-open-ended-fix.js'),'utf8');
const addressbookFix=await readFile(join(root,'addressbook-fix.js'),'utf8');
const avatar=await readFile(join(root,'avatar.js'),'utf8');
let socialFeed=await readFile(join(root,'social-feed.js'),'utf8');

// 소셜 피드에서도 QT 원문을 상세 나눔 화면과 동일하게 빠짐없이 노출합니다.
// 기존 구현은 적용/나눔 내용이 있으면 bestVerse와 question을 숨겨 글이 잘린 것처럼 보였습니다.
const oldSocialBody=String.raw`function bodyText(p){if(p.kind==='qt'){const a=[p.shareContent,p.applyContent].filter(Boolean).join('\n\n');return esc(a||p.bestVerse||'').replace(/\n/g,'<br>')}return esc(p.situation||'').replace(/\n/g,'<br>')}`;
const fullSocialBody=String.raw`function bodyText(p){if(p.kind==='qt'){const rows=[['인상 깊은 구절',p.bestVerse],['적용할 점',p.applyContent],['나누고 싶은 내용',p.shareContent],['궁금한 점',p.question]].filter(x=>x[1]);return rows.map((x,i)=>'<div'+(i?' style="margin-top:14px"':'')+'><div style="font-size:11px;font-weight:850;color:var(--brand);margin-bottom:4px">'+x[0]+'</div><div>'+esc(x[1]).replace(/\n/g,'<br>')+'</div></div>').join('')}return esc(p.situation||'').replace(/\n/g,'<br>')}`;
if(!socialFeed.includes(oldSocialBody))throw new Error('social-feed bodyText patch target not found');
socialFeed=socialFeed.replace(oldSocialBody,fullSocialBody);

const challengeReminder=await readFile(join(root,'challenge-reminder-ui.js'),'utf8');
const challengePushNav=await readFile(join(root,'challenge-push-nav.js'),'utf8');

const inline=[native,gasZero,community].map(code=>code.replace(/<\/script/gi,'<\\/script')).join('\n\n')
  +'\n\n'+[communityEditor,bibleBack,appUx,pwaUpdate,addressbookFix,exitHint,bibleProvider,bibleReader,bibleProgressSync,nanumV2,nanumV2ComposeFix,nanumRangePatch,nanumRangeOpenEndedFix,nanumTime,avatar,socialFeed,challengeReminder,push,challengePushNav].map(code=>code.replace(/<\/script/gi,'<\\/script')).join('\n\n');
const tag='<script>\n'+inline+'\n</script>';
const at=html.lastIndexOf('</body>');
if(at<0)throw new Error('index.html body close tag not found');
html=html.slice(0,at)+tag+'\n'+html.slice(at);
await writeFile(join(dist,'index.html'),html,'utf8');
console.log('Yeorin Supabase-only build complete');
