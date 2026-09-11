import { readFile, writeFile } from 'node:fs/promises';

const path='dist/index.html';
let html=await readFile(path,'utf8');

const start=html.indexOf('async function loadDayPosts(ds,silent){');
const marker='// 글이 추가/삭제되면 스트립의 점 표시도 갱신';
const end=start>=0?html.indexOf(marker,start):-1;
if(start<0||end<0)throw new Error('loadDayPosts block not found');

const replacement=`let _yeorinWeekMem={};
let _yeorinWeekInflight={};
let _yeorinDayReqSeq=0;

function _yeorinWeekStart(ds){
  const p=String(ds).split('-');
  const d=new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));
  const dow=(d.getDay()+6)%7;
  d.setDate(d.getDate()-dow);
  return d.getFullYear()+'-'+pd(d.getMonth()+1)+'-'+pd(d.getDate());
}
function _yeorinApplyDay(ds,pair){
  qtPosts=(pair&&pair.qt&&pair.qt.posts)||[];
  prPosts=(pair&&pair.prayer&&pair.prayer.posts)||[];
  dayLoading=false;
  if(nanumSub==='qt')renderQt();else renderPrayer();
}
async function _yeorinFetchWeek(ds,force){
  const ws=_yeorinWeekStart(ds);
  if(!force&&_yeorinWeekMem[ws])return _yeorinWeekMem[ws];
  if(!force){
    const saved=getYeorinCache('week_'+ws);
    if(saved){_yeorinWeekMem[ws]=saved;return saved;}
  }
  if(_yeorinWeekInflight[ws])return _yeorinWeekInflight[ws];
  const job=directRpc('yeorin_week_posts',{p_week_start:ws}).then(function(data){
    _yeorinWeekMem[ws]=data||{};
    setYeorinCache('week_'+ws,_yeorinWeekMem[ws]);
    delete _yeorinWeekInflight[ws];
    return _yeorinWeekMem[ws];
  }).catch(function(e){delete _yeorinWeekInflight[ws];throw e;});
  _yeorinWeekInflight[ws]=job;
  return job;
}

async function loadDayPosts(ds,silent){
  const req=++_yeorinDayReqSeq;
  _loadedDate=ds;
  const ws=_yeorinWeekStart(ds);
  const cached=_yeorinWeekMem[ws]||getYeorinCache('week_'+ws);

  if(cached&&cached[ds]){
    _yeorinWeekMem[ws]=cached;
    _yeorinApplyDay(ds,cached[ds]);
    _yeorinFetchWeek(ds,true).then(function(fresh){
      if(req===_yeorinDayReqSeq&&_loadedDate===ds&&fresh&&fresh[ds])_yeorinApplyDay(ds,fresh[ds]);
    }).catch(function(){});
    return;
  }

  dayLoading=true;
  if(!silent){
    qtPosts=[];prPosts=[];
    if(nanumSub==='qt')renderQt();else renderPrayer();
  }
  try{
    const week=await _yeorinFetchWeek(ds,false);
    if(req!==_yeorinDayReqSeq||_loadedDate!==ds)return;
    _yeorinApplyDay(ds,week&&week[ds]);
  }catch(e){
    if(req!==_yeorinDayReqSeq)return;
    dayLoading=false;
    console.warn('[loadDayPosts]',e);
    if(nanumSub==='qt')renderQt();else renderPrayer();
  }
}

`;

html=html.slice(0,start)+replacement+html.slice(end);
await writeFile(path,html,'utf8');
console.log('Yeorin weekly date cache patch complete');
