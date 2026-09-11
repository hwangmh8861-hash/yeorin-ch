/* 여린교회 커뮤니티 작성창 WYSIWYG 보정 */
(function(){
  'use strict';

  const COLORS={'빨강':'#D64545','주황':'#E07B24','초록':'#2F8A4E','파랑':'#2F6FD6','보라':'#7B4FD6','회색':'#8A8F8C'};
  const COLOR_RGB={
    '#d64545':'rgb(214, 69, 69)',
    '#e07b24':'rgb(224, 123, 36)',
    '#2f8a4e':'rgb(47, 138, 78)',
    '#2f6fd6':'rgb(47, 111, 214)',
    '#7b4fd6':'rgb(123, 79, 214)',
    '#8a8f8c':'rgb(138, 143, 140)'
  };

  function esc(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function markupToHtml(text){
    let html=esc(text||'');
    const colorNames=Object.keys(COLORS).join('|');
    const colorRe=new RegExp('\\[('+colorNames+')\\]([\\s\\S]*?)\\[\\/색\\]','g');
    const sizeRe=/\[(크게|작게)\]([\s\S]*?)\[\/크기\]/g;
    let prev,guard=0;
    do{
      prev=html;
      html=html.replace(colorRe,(m,c,t)=>'<span style="color:'+COLORS[c]+'">'+t+'</span>');
      html=html.replace(sizeRe,(m,z,t)=>'<span style="font-size:'+(z==='크게'?'1.28em':'.84em')+';'+(z==='크게'?'font-weight:800;':'')+'">'+t+'</span>');
      html=html.replace(/\*\*(?!\s)([^*\n]+?)\*\*/g,'<b>$1</b>');
    }while(html!==prev&&++guard<8);
    return html.replace(/\n/g,'<br>');
  }

  function colorName(v){
    const s=String(v||'').trim().toLowerCase();
    if(!s)return'';
    for(const [name,hex] of Object.entries(COLORS)){
      const h=hex.toLowerCase();
      if(s===h||s===COLOR_RGB[h]||s.replace(/\s+/g,'')===COLOR_RGB[h].replace(/\s+/g,''))return name;
    }
    return'';
  }

  function serializeNode(node){
    if(node.nodeType===Node.TEXT_NODE)return node.nodeValue||'';
    if(node.nodeType!==Node.ELEMENT_NODE)return'';
    const el=node,tag=el.tagName;
    if(tag==='BR')return'\n';
    let inner=Array.from(el.childNodes).map(serializeNode).join('');

    if(tag==='B'||tag==='STRONG')inner='**'+inner+'**';

    if(tag==='FONT'){
      const c=colorName(el.getAttribute('color'));
      if(c)inner='['+c+']'+inner+'[/색]';
      const size=String(el.getAttribute('size')||'');
      if(size==='5'||size==='6'||size==='7')inner='[크게]'+inner+'[/크기]';
      else if(size==='1'||size==='2')inner='[작게]'+inner+'[/크기]';
    }

    if(tag==='SPAN'){
      const c=colorName(el.style.color);
      if(c)inner='['+c+']'+inner+'[/색]';
      const fs=String(el.style.fontSize||'').toLowerCase();
      if(fs){
        const n=parseFloat(fs);
        if(fs.includes('em')&&n>=1.15)inner='[크게]'+inner+'[/크기]';
        else if(fs.includes('em')&&n>0&&n<=.9)inner='[작게]'+inner+'[/크기]';
        else if(fs.includes('px')&&n>=18)inner='[크게]'+inner+'[/크기]';
        else if(fs.includes('px')&&n>0&&n<=12)inner='[작게]'+inner+'[/크기]';
      }
      if(/^(bold|[6-9]00)$/i.test(String(el.style.fontWeight||'')))inner='**'+inner+'**';
    }

    if(tag==='DIV'||tag==='P')inner+='\n';
    return inner;
  }

  function serializeEditor(el){
    return Array.from(el.childNodes).map(serializeNode).join('')
      .replace(/\u00a0/g,' ')
      .replace(/\n{3,}/g,'\n\n')
      .replace(/\n+$/,'');
  }

  function upgradeEditor(ta){
    if(!ta||ta.dataset.wysiwygDone)return;
    const ed=document.createElement('div');
    ed.id='communityComposeText';
    ed.className='community-editor';
    ed.contentEditable='true';
    ed.setAttribute('role','textbox');
    ed.setAttribute('aria-multiline','true');
    ed.dataset.placeholder=ta.getAttribute('placeholder')||'무슨 이야기를 나누고 싶으세요?';
    ed.innerHTML=markupToHtml(ta.value||'');
    Object.defineProperty(ed,'value',{
      configurable:true,
      get(){return serializeEditor(ed);},
      set(v){ed.innerHTML=markupToHtml(v||'');}
    });
    ed.addEventListener('input',()=>{
      if(typeof window.communityComposeInput==='function')window.communityComposeInput();
    });
    ta.dataset.wysiwygDone='1';
    ta.replaceWith(ed);
    const preview=document.getElementById('communityRichPreview');
    if(preview)preview.style.display='none';
    setTimeout(()=>{try{ed.focus();const sel=window.getSelection();if(sel&&ed.childNodes.length){sel.selectAllChildren(ed);sel.collapseToEnd();}}catch(e){}},30);
  }

  function scan(root){
    const el=(root&&root.nodeType===1&&root.id==='communityComposeText')?root:(root&&root.querySelector?root.querySelector('textarea#communityComposeText'):null);
    if(el&&el.tagName==='TEXTAREA')upgradeEditor(el);
  }

  const style=document.createElement('style');
  style.id='community-editor-wysiwyg-style';
  style.textContent=`
    .community-editor{width:100%;min-height:125px;border:none;outline:none;font-size:15px;line-height:1.65;color:var(--ink);padding:6px 2px 12px;background:#fff;white-space:pre-wrap;word-break:break-word;}
    .community-editor:empty:before{content:attr(data-placeholder);color:#9aa09c;pointer-events:none;}
    #communityRichPreview{display:none!important;}
  `;
  document.head.appendChild(style);

  const originalFormat=window.communityFormat;
  window.communityFormat=function(kind,arg){
    const ed=document.getElementById('communityComposeText');
    if(!ed||!ed.isContentEditable){
      if(typeof originalFormat==='function')return originalFormat.apply(this,arguments);
      return;
    }
    ed.focus();
    try{
      if(kind==='bold')document.execCommand('bold',false,null);
      else if(kind==='color'&&COLORS[arg])document.execCommand('foreColor',false,COLORS[arg]);
      else if(kind==='size')document.execCommand('fontSize',false,arg==='크게'?'5':'2');
      else if(kind==='emoji')document.execCommand('insertText',false,String(arg||''));
    }catch(e){console.warn('[community editor format]',e);}
    if(kind!=='emoji'&&typeof window.toggleCommunityPalette==='function')window.toggleCommunityPalette('');
    ed.dispatchEvent(new Event('input',{bubbles:true}));
  };

  const observer=new MutationObserver(muts=>{
    for(const m of muts)for(const n of m.addedNodes)scan(n);
    scan(document);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  scan(document);

  console.log('[Yeorin] community WYSIWYG editor ready');
})();
