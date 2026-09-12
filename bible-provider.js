/* 여린교회 나눔용 성경 본문 공급자
 * - 본문은 Supabase bible_verses에서 장 단위로 지연 로드
 * - 한 번 불러온 장은 메모리 + localStorage에 캐시
 */
(function(){
  'use strict';

  if(window.YeorinBible && typeof window.YeorinBible.getChapter==='function')return;

  const ABBR={
    '창세기':'창','출애굽기':'출','레위기':'레','민수기':'민','신명기':'신','여호수아':'수','사사기':'삿','룻기':'룻',
    '사무엘상':'삼상','사무엘하':'삼하','열왕기상':'왕상','열왕기하':'왕하','역대상':'대상','역대하':'대하','에스라':'스','느헤미야':'느','에스더':'에',
    '욥기':'욥','시편':'시','잠언':'잠','전도서':'전','아가':'아','이사야':'사','예레미야':'렘','예레미야애가':'애','에스겔':'겔','다니엘':'단',
    '호세아':'호','요엘':'욜','아모스':'암','오바댜':'옵','요나':'욘','미가':'미','나훔':'나','하박국':'합','스바냐':'습','학개':'학','스가랴':'슥','말라기':'말',
    '마태복음':'마','마가복음':'막','누가복음':'눅','요한복음':'요','사도행전':'행','로마서':'롬','고린도전서':'고전','고린도후서':'고후','갈라디아서':'갈',
    '에베소서':'엡','빌립보서':'빌','골로새서':'골','데살로니가전서':'살전','데살로니가후서':'살후','디모데전서':'딤전','디모데후서':'딤후','디도서':'딛','빌레몬서':'몬',
    '히브리서':'히','야고보서':'약','베드로전서':'벧전','베드로후서':'벧후','요한일서':'요일','요한이서':'요이','요한삼서':'요삼','유다서':'유','요한계시록':'계'
  };

  const mem=new Map();
  const inflight=new Map();
  const TTL=30*24*60*60*1000;

  function cacheKey(book,ch){return 'yeorin_bible_'+ABBR[book]+'_'+ch;}
  function getCached(book,ch){
    const k=book+'|'+ch;
    if(mem.has(k))return mem.get(k);
    try{
      const v=JSON.parse(localStorage.getItem(cacheKey(book,ch))||'null');
      if(v&&v.ts&&Array.isArray(v.data)&&Date.now()-v.ts<TTL){mem.set(k,v.data);return v.data;}
    }catch(e){}
    return null;
  }
  function setCached(book,ch,data){
    const k=book+'|'+ch;mem.set(k,data);
    try{localStorage.setItem(cacheKey(book,ch),JSON.stringify({ts:Date.now(),data:data}));}catch(e){}
  }

  async function getChapter(book,chapter){
    book=String(book||'');
    const abbr=ABBR[book];
    const ch=Number(chapter);
    if(!abbr||!Number.isInteger(ch)||ch<1)return [];
    const hit=getCached(book,ch);if(hit)return hit;
    const k=book+'|'+ch;
    if(inflight.has(k))return inflight.get(k);
    const native=window.YeorinNative;
    if(!native||typeof native.directRpc!=='function')throw new Error('native_engine_not_ready');
    const job=native.directRpc('yeorin_bible_chapter',{p_book:abbr,p_chapter:ch}).then(function(rows){
      rows=Array.isArray(rows)?rows:[];
      rows=rows.map(function(v){
        return {v:Number(v.v),to:Number(v.to||v.v),label:String(v.label||v.v),key:String(v.key||v.label||v.v),t:String(v.t||'').trim()};
      });
      setCached(book,ch,rows);inflight.delete(k);return rows;
    }).catch(function(e){inflight.delete(k);throw e;});
    inflight.set(k,job);return job;
  }

  function clearCache(){
    mem.clear();inflight.clear();
    try{Object.keys(localStorage).forEach(function(k){if(k.indexOf('yeorin_bible_')===0)localStorage.removeItem(k);});}catch(e){}
  }

  window.YeorinBible={getChapter:getChapter,clearCache:clearCache};
  console.log('[Yeorin] Bible RPC provider ready');
})();
