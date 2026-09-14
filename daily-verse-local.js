/* 여린교회 홈 '오늘의 말씀' 로컬 전용
 * 외부 AI/API를 호출하지 않고 기존 VERSES + 100개 로컬 멘트 조합으로만 동작합니다.
 */
(function(){
  'use strict';
  if(window.__YEORIN_DAILY_LOCAL__)return;
  window.__YEORIN_DAILY_LOCAL__=true;

  const OPENINGS=[
    '오늘 모든 것을 완벽하게 해내지 않아도 괜찮아요.',
    '마음이 조금 무거운 날이라면 서두르지 않아도 괜찮아요.',
    '아직 답이 보이지 않는 일이 있어도 너무 앞서 걱정하지 마세요.',
    '바쁜 하루 속에서도 잠깐 멈춰 숨을 고르는 시간이 필요해요.',
    '오늘 계획대로 되지 않는 일이 생겨도 하루 전체가 잘못된 것은 아니에요.',
    '큰 결심보다 작은 한 걸음 하나가 오늘을 바꿀 수 있어요.',
    '마음에 걱정이 많다면 전부 혼자 정리하려 하지 않아도 돼요.',
    '누군가의 말이 마음에 오래 남더라도 그 말이 당신의 가치를 결정하지는 않아요.',
    '조금 늦어지는 것 같아도 조급해하지 마세요.',
    '오늘은 결과보다 과정에 충실해보세요.',
    '무엇을 선택해야 할지 모르겠다면 모든 답을 한 번에 찾으려 하지 마세요.',
    '지친 마음에는 더 많은 채찍보다 쉼이 필요할 때가 있어요.',
    '오늘 좋은 일이 생기면 당연하게 넘기지 말고 잠깐 감사해보세요.',
    '아무도 알아주지 않는 수고처럼 느껴져도 낙심하지 마세요.',
    '실수한 일이 떠오른다면 계속 자신을 몰아붙이지 마세요.',
    '오늘 해야 할 일이 많아 보여도 한꺼번에 짊어질 필요는 없어요.',
    '마음이 흔들릴 때는 상황만 바라보기보다 시선을 조금 넓혀보세요.',
    '오늘은 비교를 잠시 내려놓아 보세요.',
    '눈에 띄는 성과가 없는 하루여도 괜찮아요.',
    '기대했던 일이 잘 풀리지 않아도 너무 빨리 결론 내리지 마세요.'
  ];

  const CLOSINGS=[
    '맡겨진 하루를 차분히 걸으며 하나님이 함께하심을 기억해보세요.',
    '지금 할 수 있는 한 걸음에 마음을 모아보세요. 작은 걸음도 충분히 소중합니다.',
    '기도하며 하나씩 내려놓고 오늘의 몫만 천천히 살아가 보세요.',
    '모든 것이 선명하지 않아도 괜찮아요. 오늘 필요한 힘은 오늘만큼 채워질 거예요.',
    '좋은 목자가 앞서 걸으신다는 마음으로 남은 하루를 조금 가볍게 걸어가 보세요.'
  ];

  const MESSAGE_COUNT=OPENINGS.length*CLOSINGS.length; // 20 x 5 = 100
  let lastRandomKey='';

  function hash32(str){
    let h=2166136261;
    str=String(str||'');
    for(let i=0;i<str.length;i++){
      h^=str.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return h>>>0;
  }

  function dateKey(){
    const d=new Date();
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,'0');
    const day=String(d.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+day;
  }

  function cleanVerseText(v){
    return String(v&&v.t||'').replace(/<br\s*\/?\s*>/gi,' ').replace(/\s+/g,' ').trim();
  }

  function verses(){
    try{return (typeof VERSES!=='undefined'&&Array.isArray(VERSES)&&VERSES.length)?VERSES:[];}
    catch(e){return[];}
  }

  function messageAt(index){
    const i=((Number(index)||0)%MESSAGE_COUNT+MESSAGE_COUNT)%MESSAGE_COUNT;
    const opening=OPENINGS[Math.floor(i/CLOSINGS.length)];
    const closing=CLOSINGS[i%CLOSINGS.length];
    return opening+' '+closing;
  }

  function pack(verseIndex,messageIndex){
    const vs=verses();
    const v=vs.length?vs[((verseIndex%vs.length)+vs.length)%vs.length]:{t:'오늘도 말씀 안에서 천천히 걸어가세요',r:''};
    return {
      verseText:cleanVerseText(v),
      verseRef:String(v.r||''),
      yeorinMessage:messageAt(messageIndex)
    };
  }

  function today(userId){
    const seed=hash32(dateKey()+'|'+String(userId||''));
    const vs=verses();
    const verseIndex=vs.length?seed%vs.length:0;
    const messageIndex=(Math.floor(seed/Math.max(vs.length,1))+seed)%MESSAGE_COUNT;
    return pack(verseIndex,messageIndex);
  }

  function randomInt(max){
    if(max<=1)return 0;
    try{
      if(window.crypto&&window.crypto.getRandomValues){
        const a=new Uint32Array(1);window.crypto.getRandomValues(a);return a[0]%max;
      }
    }catch(e){}
    return Math.floor(Math.random()*max);
  }

  function another(userId){
    const vs=verses();
    let verseIndex=0,messageIndex=0,key='';
    for(let i=0;i<8;i++){
      verseIndex=randomInt(Math.max(vs.length,1));
      messageIndex=randomInt(MESSAGE_COUNT);
      key=verseIndex+'|'+messageIndex;
      if(key!==lastRandomKey)break;
    }
    lastRandomKey=key;
    return pack(verseIndex,messageIndex);
  }

  window.YeorinDailyLocal={
    today:today,
    another:another,
    count:MESSAGE_COUNT
  };

  // 기존 gas('getDailyVerseForUser') 호출 자체를 로컬에서 가로채 AI Edge Function으로 나가지 않게 합니다.
  const baseGas=window.gas;
  window.gas=async function(fn,...args){
    if(fn==='getDailyVerseForUser'){
      const hasRequest=args.length>1&&String(args[1]||'').trim();
      return hasRequest?another(args[0]):today(args[0]);
    }
    if(fn==='clearDailyVerseCache')return{success:true};
    if(typeof baseGas!=='function')throw new Error('gas_transport_not_ready');
    return baseGas.apply(this,[fn,...args]);
  };

  // 홈의 '다른 말씀 받기'는 입력 팝업이나 AI 호출 없이 즉시 다른 로컬 말씀/멘트로 교체합니다.
  window.showYeorinVerseInput=function(){
    try{
      const r=another((typeof CU!=='undefined'&&CU)?CU.id:'');
      _yeorinDailyVerseCache={text:r.verseText,reference:r.verseRef,message:r.yeorinMessage};
      _yeorinDailyVerseDate=(typeof td==='function'?td():dateKey());
      if(typeof renderHome==='function')renderHome();
      if(typeof showToast==='function')showToast('다른 말씀을 골라드렸어요','success');
    }catch(e){
      console.warn('[daily verse local]',e);
      if(typeof showToast==='function')showToast('다른 말씀을 불러오지 못했어요','error');
    }
  };

  // 예전 팝업이 남아 있는 화면에서도 API를 호출하지 않도록 호환 처리합니다.
  window.submitYeorinVerse=async function(){
    window.showYeorinVerseInput();
    try{if(typeof closePopup==='function')closePopup();}catch(e){}
  };

  console.log('[Yeorin] daily verse local ready / '+MESSAGE_COUNT+' messages / AI API 0');
})();
