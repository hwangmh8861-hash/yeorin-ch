/* 여린교회 나눔 V2 작성 버튼 복구 보정 */
(function(){
  'use strict';
  if(window.__YEORIN_NANUM_V2_COMPOSE_FIX__)return;
  window.__YEORIN_NANUM_V2_COMPOSE_FIX__=true;

  var baseRender=window.renderQt;
  if(typeof baseRender!=='function')return;

  function ensureComposeButton(){
    var el=document.getElementById('page-qt');
    if(!el||typeof AD==='undefined'||!AD)return;
    var existing=document.getElementById('nvComposeToggle');
    if(existing){
      existing.textContent=(typeof sqf!=='undefined'&&sqf)?'닫기':'묵상 나누기';
      return;
    }
    var btn=document.createElement('button');
    btn.id='nvComposeToggle';
    btn.className='btn-dashed';
    btn.textContent=(typeof sqf!=='undefined'&&sqf)?'닫기':'묵상 나누기';
    btn.addEventListener('click',function(){
      if(typeof sqf==='undefined')return;
      sqf=!sqf;
      window.renderQt();
    });
    el.insertBefore(btn,el.firstChild);
  }

  window.renderQt=function(){
    var result=baseRender.apply(this,arguments);
    ensureComposeButton();
    return result;
  };

  try{
    if(typeof AD!=='undefined'&&AD&&typeof nanumSub!=='undefined'&&nanumSub==='qt')window.renderQt();
  }catch(e){console.warn('[nanum compose fix]',e);}
})();
