import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('function challengeToday('),html.indexOf('// 📦 Phase 5:'));
const calls=[],toasts=[];
const today='2026-10-13';
class FixedDate extends Date {
  constructor(...args){super(...(args.length?args:['2026-10-13T03:00:00Z']));}
}
const active={id:'active',title:'오늘까지 읽기',book:'시편',startDate:'2026-10-01',endDate:today,status:'active',memberIds:['me'],creatorId:'me'};
const expired={...active,id:'expired',title:'지난 챌린지',endDate:'2026-10-12'};
const manual={...active,id:'manual',title:'일찍 완료',status:'completed',endDate:'2026-10-30'};
const upcoming={...active,id:'upcoming',title:'다음 읽기',startDate:'2026-10-14',endDate:'2026-10-20'};
const context=vm.createContext({
  Date:FixedDate,Intl,AD:{challenges:[active,expired,manual,upcoming],challengeCerts:[{challengeId:'expired',userId:'me',date:'2026-10-01'}]},
  CU:{id:'me',emoji:'🌿'},chFilter:'active',viewChId:null,schf:false,
  ico:()=>'<svg></svg>',escapeHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
  gm:()=>({emoji:'🌿',name:'테스트'}),renderBible:()=>{},showToast:s=>toasts.push(s),
  gas:async(...args)=>{calls.push(args);},confirm:()=>true
});
vm.runInContext(code,context);
assert.equal(context.challengeToday(new Date('2026-10-12T14:59:59Z')),'2026-10-12');
assert.equal(context.challengeToday(new Date('2026-10-12T15:00:00Z')),today);
assert.equal(context.challengeStatus(active,today),'active','종료 당일은 진행 중');
assert.equal(context.challengeStatus(active,'2026-10-14'),'completed','종료일 다음 날은 완료');
assert.equal(context.challengeStatus(expired,today),'completed');
assert.equal(context.challengeStatus(manual,today),'completed','수동 완료 유지');
assert.equal(expired.status,'active','화면 분류가 원본 데이터를 변경하지 않음');
let list=context.renderChallenges();
assert.ok(list.includes('오늘까지 읽기'));
assert.ok(list.includes('다음 읽기')&&list.includes('시작 예정'));
assert.ok(!list.includes('지난 챌린지')&&!list.includes('일찍 완료'));
assert.equal((list.match(/class="ch-filter-count">2</g)||[]).length,2,'진행/완료 개수');
context.chFilter='completed';
list=context.renderChallenges();
assert.ok(list.includes('지난 챌린지')&&list.includes('일찍 완료'));
assert.ok(!list.includes('오늘까지 읽기')&&!list.includes('다음 읽기'));
assert.ok(list.includes('ch-completed')&&list.includes('is-completed'));
assert.ok(list.includes('참여 완료')&&!list.includes('참여 중</span>'));
assert.ok(!list.includes('joinCh('));
assert.ok(list.includes('8%'),'종료 후에도 실제 인증 달성률 유지');
for(const id of ['expired','manual']){
  const detail=context.renderChDetail(id);
  assert.ok(detail.includes('챌린지 완료'));
  assert.ok(!detail.includes('certToday(')&&!detail.includes('joinCh(')&&!detail.includes('completeCh('));
  assert.ok(detail.includes('인증 기록')&&detail.includes('참여자 현황'));
}
assert.ok(context.renderChDetail('active').includes('오늘 읽었어요!'));
assert.ok(!context.renderChDetail('upcoming').includes('certToday('));
context.viewChId='expired';context.chFilter='active';context.renderChallenges();
assert.equal(context.chFilter,'completed','공유 링크에서 돌아가면 완료 목록');
context.viewChId=null;
await context.certToday('expired');await context.joinCh('expired');await context.certToday('manual');
assert.equal(calls.length,0,'완료된 항목의 오래된 버튼도 API를 호출하지 않음');
await context.certToday('upcoming');assert.equal(calls.length,0);
await context.certToday('active');await context.certToday('active');
assert.equal(calls.length,1,'중복 인증 방지');
assert.deepEqual(calls[0],['certChallenge','active','me',today]);
assert.ok(context.renderChDetail('active').includes('오늘 인증 완료!'));
context.AD.challenges=[];
assert.ok(context.renderChallenges().includes('완료된 챌린지가 아직 없어요'));
context.chFilter='active';assert.ok(context.renderChallenges().includes('진행 중인 챌린지가 없어요'));

const built=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
let scripts=0;
for(const match of built.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(/\bsrc\s*=/.test(match[1])||/application\/ld\+json/.test(match[1]))continue;
  new vm.Script(match[2],{filename:`dist/index.html#script-${++scripts}`});
}
assert.ok(built.includes('ch-completion-banner')&&built.includes('function challengeStatus('));
assert.ok(built.includes("c=>challengeStatus(c)==='active'"),'알림 목록도 종료 항목 제외');
console.log(`challenge lifecycle validation ok; ${scripts} built scripts parsed`);
