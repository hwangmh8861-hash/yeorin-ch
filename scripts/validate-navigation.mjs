import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const ux=await readFile(new URL('../app-ux-fix.js',import.meta.url),'utf8');
const reader=await readFile(new URL('../bible-back-fix.js',import.meta.url),'utf8');
function app(initial={}){
  const listeners=[],timers=[],nodes=new Map(),stack=[null];let position=0;
  const document={hidden:false,head:{appendChild(el){nodes.set(el.id,el)}},
    getElementById:id=>nodes.get(id)||null,
    createElement:()=>({style:{},dataset:{}}),addEventListener:()=>{},
    querySelector(selector){for(const id of ['ysEdit','ysWrite','ysFilter','ynUnifiedFilter','challengeReminderModal','yeorinPushModal'])if(selector.includes('#'+id)&&nodes.has(id))return nodes.get(id);return null;}
  };
  const c=vm.createContext({console,document,location:{href:'https://yeorin-ch.vercel.app/'},navigator:{},
    CU:{id:'me'},AD:{},curTab:'main',bsub:'reading',selBook:null,viewChId:null,chFilter:'active',
    selContactId:null,abSearch:'',abRoleFilter:'all',cy:2026,cm:9,cef:'all',scrollY:0,
    setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length;},clearTimeout:()=>{},
    requestAnimationFrame:fn=>fn(),scrollTo:({top})=>{c.scrollY=top;},showToast:()=>{},...initial
  });c.window=c;
  c.addEventListener=(type,fn,capture)=>listeners.push({type,fn,capture:!!capture});
  function dispatch(){
    const e={state:stack[position],stopped:false,stopImmediatePropagation(){this.stopped=true;}};
    for(const l of listeners.filter(l=>l.type==='popstate').sort((a,b)=>Number(b.capture)-Number(a.capture))){if(e.stopped)break;l.fn(e);}
  }
  c.history={get state(){return stack[position];},replaceState(st){stack[position]=structuredClone(st);},
    pushState(st){stack.splice(position+1);stack.push(structuredClone(st));position++;},
    back(){if(position>0){position--;dispatch();}},forward(){if(position<stack.length-1){position++;dispatch();}}
  };
  vm.runInContext(`
    function renderBible(){}
    function renderAddressBook(){}
    function renderCalendar(){}
    function switchTab(id){curTab=id;selBook=null;viewChId=null;if(id!=='addressbook')selContactId=null;window.scrollTo({top:0});if(id==='bible')renderBible();if(id==='addressbook')renderAddressBook();}
    function showMyPage(){curTab='mypage';selContactId=null;}
    function enterApp(){}
    function closePopup(){document.getElementById('popupRoot').innerHTML='';}
    function openBibleReaderBooks(){makeReader();}
    function closeBibleReader(){removeReader();}
  `,c);
  c.makeReader=()=>nodes.set('bibleReaderRoot',{remove(){nodes.delete('bibleReaderRoot')}});
  c.removeReader=()=>nodes.delete('bibleReaderRoot');
  vm.runInContext(reader,c);vm.runInContext(ux,c);
  for(const t of timers.splice(0))if(t.delay===0||t.delay===700)t.fn();
  return {c,nodes,stack,get position(){return position;}};
}
const {c,nodes,stack}=app();
c.bsub='challenge';c.chFilter='completed';c.switchTab('bible');c.scrollY=240;
c.viewChId='expired';c.renderBible();
assert.equal(c.history.state.route.viewChId,'expired');
const entries=stack.length;c.renderBible();c.renderBible();assert.equal(stack.length,entries,'새로고침 시 기록 중복 방지');
c.scrollY=500;c.goBackInApp();
assert.equal(c.curTab,'bible');assert.equal(c.viewChId,null);assert.equal(c.chFilter,'completed');assert.equal(c.scrollY,240);
c.history.forward();assert.equal(c.viewChId,'expired','앞으로가기 상세 복원');
c.history.back();assert.equal(c.viewChId,null);c.history.back();assert.equal(c.curTab,'main','상세 종료 후 두 번째 뒤로가기는 이전 탭');

c.bsub='reading';c.switchTab('bible');c.scrollY=150;c.selBook=0;c.renderBible();c.history.back();
assert.equal(c.selBook,null);assert.equal(c.bsub,'reading');assert.equal(c.curTab,'bible');assert.equal(c.scrollY,150);
c.history.forward();assert.equal(c.selBook,0,'창세기 인덱스 0 복원');c.goBackInApp();
c.chFilter='completed';c.bsub='challenge';c.renderBible();c.viewChId='finished';c.renderBible();
c.openBibleReaderBooks();assert.ok(nodes.has('bibleReaderRoot'));
c.history.back();assert.ok(!nodes.has('bibleReaderRoot'));assert.equal(c.viewChId,'finished','성경 리더만 닫힘');
c.history.back();assert.equal(c.viewChId,null,'그다음 뒤로가기는 챌린지 목록');

c.switchTab('addressbook');c.abSearch='김';c.abRoleFilter='집사';c.renderAddressBook();c.scrollY=320;
c.selContactId='contact-1';c.renderAddressBook();c.goBackInApp();
assert.equal(c.curTab,'addressbook');assert.equal(c.selContactId,null);assert.equal(c.abSearch,'김');assert.equal(c.abRoleFilter,'집사');assert.equal(c.scrollY,320);
c.history.forward();assert.equal(c.selContactId,'contact-1');c.history.back();

c.switchTab('calendar');c.cy=2027;c.cm=1;c.cef='birthday';c.scrollY=110;c.showMyPage();
const myEntries=stack.length;c.showMyPage();assert.equal(stack.length,myEntries);
c.goBackInApp();assert.equal(c.curTab,'calendar');assert.equal(c.cy,2027);assert.equal(c.cm,1);assert.equal(c.cef,'birthday');assert.equal(c.scrollY,110);

for(const id of ['ysEdit','ysWrite','ysFilter','ynUnifiedFilter','challengeReminderModal','yeorinPushModal']){
  c.switchTab('bible');c.bsub='challenge';c.chFilter='completed';c.renderBible();c.viewChId='finished';c.renderBible();
  nodes.set(id,{querySelector:()=>null,remove(){nodes.delete(id);}});
  c.history.back();assert.ok(!nodes.has(id));assert.equal(c.curTab,'bible');assert.equal(c.viewChId,'finished',`${id}: 팝업만 닫기`);
  c.history.back();assert.equal(c.viewChId,null);assert.equal(c.chFilter,'completed');
}
c.switchTab('main');c.bsub='challenge';c.chFilter='active';c.switchTab('bible');
c.chFilter='completed';c.viewChId='shared-expired';c.renderBible();c.goBackInApp();
assert.equal(c.viewChId,null);assert.equal(c.chFilter,'completed','완료 공유 링크도 완료 목록으로 복귀');
for(const tab of ['home','nanum','calendar','addressbook']){
  c.switchTab('main');c.switchTab(tab);c.history.back();assert.equal(c.curTab,'main');
}
const deep=app({curTab:'bible',bsub:'challenge',chFilter:'completed',viewChId:'shared'}).c;
deep.goBackInApp();assert.equal(deep.curTab,'bible');assert.equal(deep.chFilter,'completed');assert.equal(deep.viewChId,null,'직접 상세 진입에도 목록 복귀 경로');
const source=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.ok(!source.includes("window.addEventListener('popstate',function(){"),'중복 상세/탭 뒤로가기 제거');
assert.ok(source.includes('완료 목록으로')&&source.includes('position:sticky'));
console.log('navigation validation ok: challenge, reading, contacts, mypage, calendar, six modal types, reader, forward/back and direct entry');
