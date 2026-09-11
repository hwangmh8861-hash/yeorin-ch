import { readFile, writeFile } from 'node:fs/promises';

const path='dist/index.html';
let html=await readFile(path,'utf8');

const qtEmpty=`content='<div class="ab-empty"><img class="yeorin-full" src="'+YIMG_FULL+'" style="height:170px;margin-bottom:10px"><br>이 날 올라온 QT가 없어요<br>첫 묵상을 나눠보세요</div>';`;
const qtEmptyNew=`content=sqf?'':'<div class="ab-empty"><img class="yeorin-full" src="'+YIMG_FULL+'" style="height:170px;margin-bottom:10px"><br>이 날 올라온 QT가 없어요<br>첫 묵상을 나눠보세요</div>';`;
if(!html.includes(qtEmpty))throw new Error('QT empty state block not found');
html=html.replace(qtEmpty,qtEmptyNew);

const prayerEmpty=`content='<div class="ab-empty"><img class="yeorin-full" src="'+YIMG_FULL+'" style="height:170px;margin-bottom:10px"><br>이 날 올라온 기도·감사가 없어요<br>마음을 나눠보세요</div>';`;
const prayerEmptyNew=`content=spf?'':'<div class="ab-empty"><img class="yeorin-full" src="'+YIMG_FULL+'" style="height:170px;margin-bottom:10px"><br>이 날 올라온 기도·감사가 없어요<br>마음을 나눠보세요</div>';`;
if(html.includes(prayerEmpty))html=html.replace(prayerEmpty,prayerEmptyNew);

const qtHelper=`<button class="btn-dashed" style="border-color:var(--green);color:var(--green)" onclick="askYeorinQTUI()"><img class="yeorin-img" src="'+YIMG+'"> 여린이 묵상 도우미</button>`;
const qtHelperNew=`<button class="btn-dashed" style="border-color:var(--green);color:var(--green);min-height:86px;display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 16px" onclick="askYeorinQTUI()"><img class="yeorin-img" src="'+YIMG+'" style="height:52px;width:52px;object-fit:contain;flex-shrink:0"><span style="display:flex;flex-direction:column;align-items:flex-start;line-height:1.25"><span style="font-size:15px;font-weight:800">여린이 묵상 도우미</span><span style="font-size:11.5px;color:var(--ink3);font-weight:600;margin-top:4px">묵상 작성을 도와드릴게요</span></span></button>`;
if(!html.includes(qtHelper))throw new Error('QT helper button not found');
html=html.replace(qtHelper,qtHelperNew);

await writeFile(path,html,'utf8');
console.log('Yeorin UI compose-state patch complete');
