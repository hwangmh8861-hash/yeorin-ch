/* 여린교회 나눔 탭 V2
 * - 카드 순서 재배치: 말씀 범위 → 나누고 싶은 내용 → 적용할 점 → 궁금한 점 → 인상 깊은 구절
 * - 본문 영역 통합 더보기(페이드)
 * - 공감: 하트 하나 → 탭하면 나머지가 옆으로 펼쳐짐
 * - 링크 자동 감지 후 썸네일 미리보기
 * - 작성 폼: 안내 문구 제거, 입력칸 흰색 고정, 인상 깊은 구절은 절 선택 방식
 *
 * 성경 본문 공급자는 아래 형태로 따로 등록합니다(미등록이면 기존 직접 입력으로 동작).
 *   window.YeorinBible = { getChapter: function(book, chapter){ return Promise<[{v:1,t:"..."}]>; } };
 */
(function(){
  'use strict';

  var CLAMP = 280;
  var LINK_TTL = 7 * 24 * 60 * 60 * 1000;
  var LINK_FN = 'https://putqauaiboychaalgyew.supabase.co/functions/v1/yeorin-link-preview';
  var URL_RE = /https?:\/\/[^\s<>"']+/g;
  var RXICO = {like:'heart', amen:'pray', touched:'dove', strength:'sparkle'};

  var style = document.createElement('style');
  style.id = 'nanum-v2';
  style.textContent = [
    '#page-qt .card{border-radius:16px;border:1px solid #EDF0EC;box-shadow:none;padding:18px 18px 14px;}',
    '.nv-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}',
    '.nv-name{font-size:15px;font-weight:500;color:var(--ink);letter-spacing:-.01em;}',
    '.nv-date{font-size:12px;color:var(--ink3);font-weight:400;margin-top:1px;}',
    '.nv-range{background:var(--brand-soft);color:#2A5F40;font-size:12.5px;font-weight:500;padding:5px 11px;border-radius:999px;white-space:nowrap;border:none;font-family:inherit;}',
    '.nv-body{position:relative;overflow:hidden;}',
    '.nv-fade{position:absolute;left:0;right:0;bottom:0;height:56px;background:linear-gradient(to bottom,rgba(255,255,255,0),#fff 88%);pointer-events:none;}',
    '.nv-more{border:none;background:none;padding:0;margin-top:10px;font-family:inherit;font-size:13.5px;font-weight:500;color:var(--brand);letter-spacing:-.01em;}',
    '.nv-blk{margin-bottom:18px;}',
    '.nv-blk:last-child{margin-bottom:0;}',
    '.nv-lb{font-size:12.5px;font-weight:500;color:var(--brand2);letter-spacing:-.01em;margin-bottom:7px;}',
    '.nv-tx{font-size:15.5px;line-height:1.8;color:#28322C;letter-spacing:-.011em;white-space:pre-wrap;word-break:break-word;}',
    '.nv-quote{border-left:2px solid #C8DFCF;border-radius:0;padding-left:14px;font-size:16px;line-height:1.82;}',
    '.nv-src{font-size:12.5px;color:var(--ink3);margin-top:10px;line-height:1.5;}',
    '.nv-lp{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;text-decoration:none;margin-top:14px;}',
    '.nv-lp img{width:54px;height:54px;border-radius:8px;object-fit:cover;flex:none;background:#E4EAE5;}',
    '.nv-lp-t{font-size:13.5px;font-weight:500;color:var(--ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4;}',
    '.nv-lp-d{font-size:12px;color:var(--ink3);margin-top:3px;}',
    '.nv-rx{display:flex;align-items:center;gap:7px;margin-top:16px;}',
    '.nv-rb{display:flex;align-items:center;gap:6px;border:1px solid var(--line2);background:#fff;border-radius:999px;padding:7px 13px;font-family:inherit;font-size:13.5px;font-weight:500;color:var(--ink2);white-space:nowrap;flex:none;}',
    '.nv-rb.on{border-color:var(--brand);color:var(--brand);}',
    '.nv-rmore{display:flex;gap:7px;overflow:hidden;max-width:0;opacity:0;transition:max-width .38s cubic-bezier(.22,1,.36,1),opacity .28s ease;}',
    '.nv-rmore.open{max-width:300px;opacity:1;}',
    '.nv-names{font-size:12.5px;color:var(--ink3);margin-top:12px;}',
    '#page-qt .input-field,#page-qt .select-field{background:#fff !important;color:var(--ink) !important;border:1px solid var(--line2) !important;border-radius:12px;font-size:15px;line-height:1.7;}',
    '#page-qt textarea.input-field{padding:11px 13px;}',
    '.nv-vlist{background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 8px;max-height:320px;overflow-y:auto;}',
    '.nv-vr{display:flex;gap:10px;padding:9px 12px 9px 10px;border-radius:10px;border-left:2px solid transparent;cursor:pointer;}',
    '.nv-vr.on{background:#EFF6F1;border-left-color:var(--brand);}',
    '.nv-vn{font-size:12px;color:#A6B0A9;min-width:18px;padding-top:4px;}',
    '.nv-vr.on .nv-vn{color:var(--brand);}',
    '.nv-vt{flex:1;font-size:15px;line-height:1.75;color:#28322C;}',
    '.nv-hint{font-size:12.5px;color:var(--ink3);margin-top:8px;padding-left:2px;}'
  ].join('\n');
  document.head.appendChild(style);

  /* ---------- 링크 미리보기 ---------- */

  var linkMem = {};

  function linkKey(u){ return 'yeorin_lp_' + u; }

  function linkCached(u){
    if(linkMem[u]) return linkMem[u];
    try{
      var raw = localStorage.getItem(linkKey(u));
      if(!raw) return null;
      var v = JSON.parse(raw);
      if(!v || !v.ts || Date.now() - v.ts > LINK_TTL) return null;
      linkMem[u] = v.data;
      return v.data;
    }catch(e){ return null; }
  }

  function linkStore(u, data){
    linkMem[u] = data;
    try{ localStorage.setItem(linkKey(u), JSON.stringify({ts:Date.now(), data:data})); }catch(e){}
  }

  var linkInflight = {};

  function linkFetch(u){
    var hit = linkCached(u);
    if(hit) return Promise.resolve(hit);
    if(linkInflight[u]) return linkInflight[u];

    var native = window.YeorinNative;
    var headers = {'Content-Type':'application/json'};
    if(native && native.session && native.session.access_token){
      headers.Authorization = 'Bearer ' + native.session.access_token;
    }

    linkInflight[u] = fetch(LINK_FN, {method:'POST', headers:headers, body:JSON.stringify({url:u})})
      .then(function(r){ return r.json(); })
      .then(function(d){
        var data = (d && !d.error) ? d : {url:u, title:u, site:hostOf(u)};
        linkStore(u, data);
        delete linkInflight[u];
        return data;
      })
      .catch(function(){
        var fb = {url:u, title:u, site:hostOf(u)};
        linkStore(u, fb);
        delete linkInflight[u];
        return fb;
      });
    return linkInflight[u];
  }

  function hostOf(u){
    try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return ''; }
  }

  function firstUrl(post){
    var text = [post.shareContent, post.applyContent, post.question, post.bestVerse].join('\n');
    var m = text.match(URL_RE);
    return m && m.length ? m[0].replace(/[),.]+$/,'') : null;
  }

  function linkCardHtml(u, data){
    if(!data) return '<div class="nv-lp" style="color:var(--ink3);font-size:13px">링크를 불러오는 중</div>';
    var img = data.image ? '<img src="' + escapeHtml(data.image) + '" alt="">' : '';
    return '<a class="nv-lp" href="' + escapeHtml(data.url || u) + '" target="_blank" rel="noopener noreferrer">'
      + img
      + '<div style="flex:1;min-width:0">'
      + '<div class="nv-lp-t">' + escapeHtml(data.title || u) + '</div>'
      + '<div class="nv-lp-d">' + escapeHtml(data.site || hostOf(u)) + '</div>'
      + '</div>'
      + ico('arrowRight', 15)
      + '</a>';
  }

  function hydrateLinks(root){
    (root || document).querySelectorAll('[data-nv-link]').forEach(function(slot){
      var u = slot.getAttribute('data-nv-link');
      if(slot.getAttribute('data-done') === '1') return;
      var hit = linkCached(u);
      if(hit){ slot.innerHTML = linkCardHtml(u, hit); slot.setAttribute('data-done','1'); return; }
      linkFetch(u).then(function(d){
        if(!slot.isConnected) return;
        slot.innerHTML = linkCardHtml(u, d);
        slot.setAttribute('data-done','1');
      });
    });
  }

  /* ---------- 카드 본문 ---------- */

  function blk(label, text, extraClass){
    if(!text) return '';
    return '<div class="nv-blk"><div class="nv-lb">' + label + '</div>'
      + '<div class="nv-tx ' + (extraClass || '') + '">' + escapeHtml(text) + '</div></div>';
  }

  function quoteBlk(post){
    if(!post.bestVerse) return '';
    var src = rangeLabel(post);
    return '<div class="nv-blk"><div class="nv-lb">인상 깊은 구절</div>'
      + '<div class="nv-tx nv-quote">' + escapeHtml(post.bestVerse)
      + (src ? '<div class="nv-src">' + escapeHtml(src) + '</div>' : '')
      + '</div></div>';
  }

  function rangeLabel(p){
    if(!p.book) return '';
    if(p.chFrom === p.chTo && p.vsFrom === p.vsTo) return p.book + ' ' + p.chFrom + ':' + p.vsFrom;
    return p.book + ' ' + p.chFrom + ':' + p.vsFrom + '–' + p.chTo + ':' + p.vsTo;
  }

  function rxHtml(rx, id){
    rx = rx || {};
    var like = QR[0];
    var liked = (rx[like.k] || []).includes(CU.id);
    var total = QR.reduce(function(n, r){ return n + (rx[r.k] || []).length; }, 0);

    var main = '<button class="nv-rb' + (liked ? ' on' : '') + '" id="rxm-' + id + '"'
      + ' aria-label="공감하기" onclick="event.stopPropagation();NanumV2.tapMain(\'' + id + '\')">'
      + ico('heart', 17) + '<span>' + (total || '') + '</span></button>';

    var more = QR.slice(1).map(function(r, i){
      var l = rx[r.k] || [];
      var on = l.includes(CU.id);
      return '<button class="nv-rb' + (on ? ' on' : '') + '" style="transform:translateX(-6px);opacity:0;'
        + 'transition:transform .3s cubic-bezier(.22,1,.36,1) ' + (i * 60) + 'ms,opacity .3s ease ' + (i * 60) + 'ms"'
        + ' onclick="event.stopPropagation();NanumV2.pick(\'' + id + '\',\'' + r.k + '\')">'
        + ico(RXICO[r.k] || 'heart', 16) + r.l + (l.length ? ' <span class="cnt">' + l.length + '</span>' : '')
        + '</button>';
    }).join('');

    var names = QR.map(function(r){
      var l = rx[r.k] || [];
      if(!l.length) return '';
      return r.l + ' ' + l.map(function(u){ return escapeHtml(gm(u).name); }).join(', ');
    }).filter(Boolean).join(' · ');

    return '<div class="nv-rx">' + main + '<div class="nv-rmore" id="rxx-' + id + '">' + more + '</div></div>'
      + (names ? '<div class="nv-names">' + names + '</div>' : '');
  }

  /* ---------- renderQt 교체 ---------- */

  var open = {};

  window.renderQt = function(){
    var el = document.getElementById('page-qt');
    if(!el) return;
    if(!AD){ el.innerHTML = loadingView('qt', '나눔을 불러오고 있어요'); return; }

    var form = sqf ? formHtml() : '';

    var posts = '';
    qtPosts.forEach(function(p){
      var m = gm(p.authorId), own = p.authorId === CU.id;
      var u = firstUrl(p);

      posts += '<div class="card" style="position:relative' + (p._pending ? ';opacity:.6' : '') + '">'
        + '<div class="nv-head">'
        + '<div class="avatar">' + m.emoji + '</div>'
        + '<div style="flex:1;min-width:0"><div class="nv-name">' + escapeHtml(m.name) + '</div>'
        + '<div class="nv-date">' + escapeHtml(p.date) + '</div></div>'
        + (p.book ? '<button class="nv-range" onclick="NanumV2.openRange(\'' + p.id + '\')">' + escapeHtml(rangeLabel(p)) + '</button>' : '')
        + (own && !p._pending ? '<button class="edit-menu-btn" onclick="emo=emo===\'qt-' + p.id + '\'?null:\'qt-' + p.id + '\';renderQt()">⋯</button>' : '')
        + '</div>'
        + (emo === 'qt-' + p.id ? '<div class="edit-dropdown"><button onclick="editQT(\'' + p.id + '\')">' + ico('edit', 15) + ' 수정</button><button onclick="delQT(\'' + p.id + '\')">' + ico('trash', 15) + ' 삭제</button></div>' : '')
        + '<div class="nv-body" id="nvb-' + p.id + '"'
        + (open[p.id] ? '' : ' style="max-height:' + CLAMP + 'px"') + '>'
        + blk('나누고 싶은 내용', p.shareContent)
        + blk('적용할 점', p.applyContent)
        + blk('궁금한 점', p.question)
        + quoteBlk(p)
        + '</div>'
        + (u ? '<div data-nv-link="' + escapeHtml(u) + '"></div>' : '')
        + rxHtml(p.reactions, p.id)
        + renderCm(p.comments, 'qt', p.id)
        + '</div>';
    });

    el.innerHTML = form + posts;

    qtPosts.forEach(function(p){ setupClamp(p.id); });
    hydrateLinks(el);
    if(sqf) setupForm();
  };

  function setupClamp(id){
    var body = document.getElementById('nvb-' + id);
    if(!body) return;
    if(open[id]){
      body.style.maxHeight = 'none';
      addMore(body, id, true);
      return;
    }
    if(body.scrollHeight - body.clientHeight <= 6) return;
    var fade = document.createElement('div');
    fade.className = 'nv-fade';
    body.appendChild(fade);
    addMore(body, id, false);
  }

  function addMore(body, id, isOpen){
    if(body.parentNode.querySelector('.nv-more')) return;
    var btn = document.createElement('button');
    btn.className = 'nv-more';
    btn.textContent = isOpen ? '접기' : '더보기';
    btn.addEventListener('click', function(){
      open[id] = !open[id];
      renderQt();
    });
    body.parentNode.insertBefore(btn, body.nextSibling);
  }

  /* ---------- 공감 동작 ---------- */

  var expanded = {};

  window.NanumV2 = {
    tapMain: function(id){
      if(expanded[id]){ expanded[id] = false; togRx('qt', id, QR[0].k); return; }
      expanded[id] = true;
      var box = document.getElementById('rxx-' + id);
      if(!box) return;
      box.classList.add('open');
      box.querySelectorAll('button').forEach(function(b){
        b.style.transform = 'translateX(0)';
        b.style.opacity = '1';
      });
    },
    pick: function(id, key){
      expanded[id] = false;
      togRx('qt', id, key);
    },
    openRange: function(id){
      var p = qtPosts.find(function(x){ return x.id === String(id); });
      if(!p) return;
      if(window.YeorinBible && typeof window.YeorinBible.openChapter === 'function'){
        window.YeorinBible.openChapter(p.book, p.chFrom);
        return;
      }
      showToast(rangeLabel(p), 'success');
    }
  };

  /* ---------- 작성 폼 ---------- */

  var picked = [];

  function formHtml(){
    var opts = BN.map(function(b){ return '<option>' + b + '</option>'; }).join('');
    var hasBible = !!(window.YeorinBible && typeof window.YeorinBible.getChapter === 'function');

    return '<div class="card">'
      + '<div class="fg"><label class="q-label">읽은 말씀</label>'
      + '<div style="display:flex;gap:8px">'
      + '<select class="select-field" id="qB" style="flex:1">' + opts + '</select>'
      + (hasBible ? '<select class="select-field" id="qCF" style="width:104px;text-align:center"><option value="">장 선택</option></select>' : '<input class="input-field" id="qCF" type="number" inputmode="numeric" style="width:88px;text-align:center">')
      + '</div></div>'
      + (hasBible
          ? '<div class="fg"><div class="nv-vlist" id="qVL"></div><div class="nv-hint" id="qVH">마음에 닿은 절을 탭하면 인상 깊은 구절로 담겨요</div></div>'
          : '<div class="fg"><label class="q-label">인상 깊은 구절</label><textarea class="input-field" id="qBV" rows="3"></textarea></div>')
      + (hasBible ? '<input type="hidden" id="qBV">' : '') + '<input type="hidden" id="qVF"><input type="hidden" id="qVT"><input type="hidden" id="qCT">'
      + '<div class="fg"><label class="q-label">나누고 싶은 내용</label><textarea class="input-field" id="qSH" rows="4"></textarea></div>'
      + '<div class="fg"><label class="q-label">적용할 점</label><textarea class="input-field" id="qAP" rows="3"></textarea></div>'
      + '<div class="fg"><label class="q-label">궁금한 점 (선택)</label><textarea class="input-field" id="qQQ" rows="2"></textarea></div>'
      + '<div id="qLP"></div>'
      + '<div id="yeorinQT"></div>'
      + '<button class="btn-dashed" style="border-color:var(--green);color:var(--green)" onclick="askYeorinQTUI()"><img class="yeorin-img" src="' + YIMG + '"> 여린이 묵상 도우미</button>'
      + '<button class="btn-primary" id="qtSubmitBtn" onclick="addQT()">나누기</button>'
      + '</div>';
  }

  function setupForm(){
    if(typeof applyQtDraft === 'function') applyQtDraft();

    ['qSH','qAP','qQQ'].forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      el.addEventListener('blur', function(){
        var m = el.value.match(URL_RE);
        var slot = document.getElementById('qLP');
        if(!slot || !m) return;
        var u = m[0].replace(/[),.]+$/,'');
        slot.setAttribute('data-nv-link', u);
        slot.removeAttribute('data-done');
        slot.innerHTML = '';
        hydrateLinks(document);
      });
    });

    var bookEl = document.getElementById('qB'), chEl = document.getElementById('qCF');
    if(!bookEl || !chEl) return;

    function fillChapters(selected){
      if(chEl.tagName !== 'SELECT') return;
      var info = (typeof BIBLE !== 'undefined' ? BIBLE : []).find(function(x){ return x.n === bookEl.value; });
      var max = info ? Number(info.c) : 0;
      var html = '<option value="">장 선택</option>';
      for(var n=1;n<=max;n++) html += '<option value="'+n+'"'+(String(selected)===String(n)?' selected':'')+'>'+n+'장</option>';
      chEl.innerHTML = html;
    }

    var draftCh = (typeof qtDraft !== 'undefined' && qtDraft && qtDraft.cf) ? String(qtDraft.cf) : chEl.value;
    fillChapters(draftCh);
    var load = function(){
      setHidden('qVF','');setHidden('qVT','');setHidden('qCT',chEl.value||'');setHidden('qBV','');
      var list=document.getElementById('qVL');
      if(list&&!chEl.value)list.innerHTML='<div style="padding:14px;color:var(--ink3);font-size:13px">장을 선택하면 본문을 자동으로 불러와요</div>';
      loadChapter(bookEl.value, chEl.value);
    };
    bookEl.addEventListener('change', function(){ fillChapters(''); load(); });
    chEl.addEventListener('change', load);
    if(chEl.value) loadChapter(bookEl.value, chEl.value);
  }

  function loadChapter(book, ch){
    var list = document.getElementById('qVL');
    if(!list || !window.YeorinBible || !ch) return;
    picked = [];
    list.innerHTML = '<div style="padding:14px;color:var(--ink3);font-size:13px">본문을 불러오는 중</div>';

    window.YeorinBible.getChapter(book, ch).then(function(verses){
      if(!verses || !verses.length){
        list.innerHTML = '<div style="padding:14px;color:var(--ink3);font-size:13px">이 장의 본문을 찾지 못했어요</div>';
        return;
      }
      list.innerHTML = verses.map(function(v){
        var key = String(v.key || v.label || v.v);
        var label = String(v.label || v.v);
        return '<div class="nv-vr" data-v="' + escapeHtml(key) + '"><div class="nv-vn">' + escapeHtml(label) + '</div>'
          + '<div class="nv-vt">' + escapeHtml(v.t) + '</div></div>';
      }).join('');
      list.querySelectorAll('.nv-vr').forEach(function(row){
        row.addEventListener('click', function(){ toggleVerse(row, verses, ch); });
      });
    }).catch(function(e){
      console.warn('[bible chapter]', e);
      list.innerHTML = '<div style="padding:14px;color:var(--ink3);font-size:13px">본문을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</div>';
    });
  }

  function toggleVerse(row, verses, ch){
    var key = String(row.dataset.v || '');
    var i = picked.indexOf(key);
    if(i >= 0){ picked.splice(i, 1); row.classList.remove('on'); }
    else { picked.push(key); row.classList.add('on'); }

    var map = {};
    (verses || []).forEach(function(x){ map[String(x.key || x.label || x.v)] = x; });
    picked.sort(function(a, b){
      var av=map[a],bv=map[b];
      return Number(av&&av.v||0)-Number(bv&&bv.v||0);
    });
    var selected = picked.map(function(k){return map[k];}).filter(Boolean);

    var hint = document.getElementById('qVH');
    if(hint){
      hint.innerHTML = selected.length
        ? '<span style="color:var(--brand);font-weight:500">' + selected.length + '개 구절 담김</span> · 다시 탭하면 빠져요'
        : '마음에 닿은 절을 탭하면 인상 깊은 구절로 담겨요';
    }

    var text = selected.map(function(x){ return x.t || ''; }).join(' ');
    var first = selected.length ? selected[0] : null;
    var last = selected.length ? selected[selected.length-1] : null;

    setHidden('qBV', text);
    setHidden('qVF', first ? first.v : '');
    setHidden('qVT', last ? (last.to || last.v) : '');
    setHidden('qCT', selected.length ? ch : '');
  }

  function setHidden(id, val){
    var el = document.getElementById(id);
    if(el){ el.value = val; return; }
    el = document.createElement('input');
    el.type = 'hidden';
    el.id = id;
    el.value = val;
    document.body.appendChild(el);
  }

  console.log('[Yeorin] nanum v2 ready');
})();
