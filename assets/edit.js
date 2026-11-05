/* 문구·사진 바로 고치기 — 관리자가 고친 내용 적용(모든 방문자) + 수정 모드(관리자) + 서식 도구 막대 */
(function () {
  'use strict';
  var KEY = 'artera.cms.v1', TOKEN = 'artera.edit.token';
  var B = document.body.getAttribute('data-base') || '/';
  var PAGE = location.pathname.replace(B, '/') || '/';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); return true; } catch (e) { return false; } }
  var norm = function (s) { return String(s || '').replace(/\s+/g, ' ').trim(); };

  // 고칠 수 있는 글자 (숫자 애니메이션·자동 갱신 영역·폼·지도는 제외)
  var SEL = 'main h1, main h2, main h3, main p, main li, main dt, main dd, main th, main td, main figcaption, main .btn, main .hero-kicker, main .zone-h, main .eyebrow, .ft-legal, .ft-addr';
  var SKIP = '[data-cells],[data-stats],[data-brands],[data-panel],[data-live-summary],[data-legend],[data-count],.calc-out,form,svg,[data-news-latest],[data-news-list],.fp-tip,[data-cell-status],[data-unit-status],.hero-h .days,.consent,.crumb,[data-news-view]';
  function editables() {
    return $$(SEL).filter(function (el) {
      if (el.closest(SKIP)) return false;
      if (el.querySelector('[data-count-to],input,select,textarea,img,svg,table,ul,ol,p,div,h1,h2,h3,li,figure')) return false;
      if (el.hasAttribute('data-count-to')) return false;
      return norm(el.textContent).length > 0;
    });
  }
  // 바꿀 수 있는 사진 (브랜드 로고·배치도 제외)
  function photos() { return $$('main img').filter(function (im) { return !im.closest('[data-brands],[data-fp],.pn-logo,.bp-logo,[data-news-view]'); }); }

  // 허용 태그만 남기기 (em·b·strong·small·br) — DOMParser 로 실행 없이 해석
  function clean(html) {
    var body = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html').body.firstChild;
    $$('*', body).reverse().forEach(function (el) {
      if (['EM', 'B', 'STRONG', 'SMALL', 'BR'].indexOf(el.tagName) < 0) el.replaceWith.apply(el, Array.prototype.slice.call(el.childNodes));
      else Array.prototype.slice.call(el.attributes).forEach(function (a) { el.removeAttribute(a.name); });
    });
    return body.innerHTML.replace(/&nbsp;/g, ' ').replace(/(<br>\s*){3,}/g, '<br><br>').trim();
  }

  // 1) 고친 문구·사진 적용 (원래 내용이 같을 때만 — 페이지 구조가 바뀌어도 엉뚱한 곳에 안 들어가게)
  var cms = load(), texts = cms.texts || {}, imgs = cms.images || {};
  var list = editables();
  list.forEach(function (el, i) {
    var k = PAGE + '|' + i, t = texts[k], o = norm(el.textContent), ai = texts[PAGE + '|*|' + o];
    el.setAttribute('data-ek', k);
    el.setAttribute('data-eorig', o);
    el.setAttribute('data-ehtml', el.innerHTML);
    if (t && t.orig === o) el.innerHTML = t.html;
    else if (ai) el.innerHTML = ai.html;
  });
  // 사진을 바꾸면 <picture> 의 휴대폰용 작은 그림(source)을 잠시 끄고, 되돌리면 다시 켬
  function setPic(im, src, custom) {
    var p = im.parentNode;
    if (p && p.tagName === 'PICTURE') Array.prototype.forEach.call(p.querySelectorAll('source'), function (s) {
      if (custom) { if (s.dataset.ms == null) s.dataset.ms = s.getAttribute('srcset') || ''; s.removeAttribute('srcset'); }
      else if (s.dataset.ms != null) s.setAttribute('srcset', s.dataset.ms);
    });
    im.src = src;
  }
  var pics = photos();
  pics.forEach(function (im, i) {
    var k = PAGE + '|img|' + i, orig = im.getAttribute('src');
    im.setAttribute('data-eimg', k); im.setAttribute('data-eorig-src', orig);
    if (imgs[k] && imgs[k].orig === orig) setPic(im, imgs[k].data, true);
  });

  // 2) 수정 모드: 관리자에서 연 경우만 (12시간 안에 발급한 표시)
  var params = new URLSearchParams(location.search);
  var tok = 0; try { tok = Number(localStorage.getItem(TOKEN) || 0); } catch (e) {}
  if (params.get('edit') !== '1' || Date.now() - tok > 12 * 3600 * 1000) return;

  var RISKY = [/최저가|가장 싸|가장 저렴/, /최고|유일|독보적|압도적|1위/, /두\s?번\s?다시|마지막 기회|곧 마감|완판/, /보장|확정\s?수익|무조건|100\s?%|평생 임대/, /입점\s?확정|출점\s?확정/, /지금이 (가장|제일)|오를 수밖에|시세 차익/];
  var style = document.createElement('style');
  style.textContent = [
    '.ebar{position:fixed;left:0;right:0;top:0;z-index:400;background:#141A45;color:#fff;display:flex;gap:14px;align-items:center;padding:10px 18px;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,.25);flex-wrap:wrap}',
    '.ebar b{color:#FF7A45}.ebar button,.ebar a{background:#fff;color:#141A45;border:0;padding:7px 12px;border-radius:3px;cursor:pointer;font:inherit;font-weight:800;text-decoration:none}',
    '.ebar .x{background:#F15A24;color:#fff}.ebar .msg{margin-left:auto;opacity:.85}.ebar .warn{background:#FFF0D6;color:#7A4A00;padding:4px 10px;border-radius:3px;font-weight:700}',
    'body.editing{padding-top:52px}body.editing .hd{top:52px}body.editing video{display:none!important}',
    'body.editing [data-ek]{outline:1px dashed rgba(241,90,36,.55);outline-offset:2px;cursor:text}',
    'body.editing [data-ek]:hover{outline:2px solid #F15A24;background:rgba(241,90,36,.06)}',
    'body.editing [data-ek]:focus{outline:2px solid #1F2761;background:#fff;color:#161B35}',
    'body.editing [data-ek].changed{outline:2px solid #2D8FD0}body.editing .reveal{opacity:1;transform:none}',
    'body.editing img[data-eimg]{outline:1px dashed rgba(45,143,208,.7);outline-offset:-3px}',
    '.etool{position:fixed;z-index:410;display:flex;gap:2px;align-items:center;background:#141A45;padding:4px;border-radius:3px;box-shadow:0 10px 26px rgba(0,0,0,.3)}',
    '.etool button{background:transparent;color:#fff;border:0;min-width:34px;height:32px;padding:0 9px;border-radius:2px;cursor:pointer;font:600 13px/1 "Pretendard Variable",Pretendard,sans-serif}',
    '.etool button:hover{background:rgba(255,255,255,.14)}.etool .sep{width:1px;height:20px;background:rgba(255,255,255,.2);margin:0 4px}',
    '.etool .em{color:#FF7A45;font-weight:900}.etool .cnt{color:rgba(255,255,255,.65);font-size:12px;padding:0 8px}',
    '.eimgbtn{position:fixed;z-index:405;background:#2D8FD0;color:#fff;border:0;padding:8px 12px;border-radius:3px;font:800 13px "Pretendard Variable",Pretendard,sans-serif;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.25)}',
    '.eimgbtn.undo{background:#fff;color:#141A45}'
  ].join('');
  document.head.appendChild(style);
  document.body.classList.add('editing');

  // 상단 막대
  var bar = document.createElement('div'); bar.className = 'ebar';
  bar.innerHTML = '<span>✎ <b>수정 모드</b> — 글자를 누르면 서식 도구가 나오고, 사진에 올리면 \'사진 바꾸기\'가 나옵니다. 다른 곳을 누르면 저장됩니다.</span><span data-cnt></span><span class="warn" data-warn hidden></span><span class="msg" data-msg></span><button data-undo>이 페이지 원래대로</button><a class="x" href="' + location.pathname + '">수정 끝내기</a>';
  document.body.appendChild(bar);
  var msg = bar.querySelector('[data-msg]'), warn = bar.querySelector('[data-warn]');
  function count() {
    var c = load(), t = c.texts || {}, im = c.images || {};
    var n = Object.keys(t).filter(function (k) { return k.indexOf(PAGE + '|') === 0; }).length + Object.keys(im).filter(function (k) { return k.indexOf(PAGE + '|') === 0; }).length;
    bar.querySelector('[data-cnt]').textContent = '이 페이지에서 바꾼 곳 ' + n + '개';
    $$('[data-ek]').forEach(function (el) { el.classList.toggle('changed', !!t[el.getAttribute('data-ek')]); });
  }
  function logLine(c, text) { c.log = c.log || []; c.log.unshift({ at: new Date().toISOString(), text: text }); c.log = c.log.slice(0, 50); }

  // ── 서식 도구 막대
  var tool = document.createElement('div'); tool.className = 'etool'; tool.hidden = true;
  tool.innerHTML = '<button data-c="b" title="굵게 (Ctrl+B)"><b>B</b></button><button data-c="em" class="em" title="주황 강조">강조</button><button data-c="small" title="작은 글자">작게</button><button data-c="br" title="줄바꿈 (Shift+Enter)">↵</button><span class="sep"></span><button data-c="plain" title="굵게·강조 지우기">서식 지우기</button><button data-c="reset" title="이 칸을 처음 문구로">원래대로</button><span class="sep"></span><span class="cnt" data-len></span><button data-c="done" title="저장 (Enter)">완료</button>';
  document.body.appendChild(tool);
  var cur = null;
  function place() {
    if (!cur) return;
    var r = cur.getBoundingClientRect(), th = 40;
    var top = r.top - th - 8; if (top < 60) top = r.bottom + 8;
    tool.style.top = top + 'px'; tool.style.left = Math.max(8, Math.min(r.left, innerWidth - tool.offsetWidth - 8)) + 'px';
    tool.querySelector('[data-len]').textContent = norm(cur.textContent).length + '자';
  }
  function wrap(tag) {
    var sel = getSelection(); if (!sel.rangeCount || sel.isCollapsed || !cur.contains(sel.anchorNode)) { msg.textContent = '먼저 꾸밀 글자를 드래그해 고르세요'; return; }
    var range = sel.getRangeAt(0);
    var inside = sel.anchorNode.parentElement && sel.anchorNode.parentElement.closest(tag);
    if (inside && cur.contains(inside)) { inside.replaceWith.apply(inside, Array.prototype.slice.call(inside.childNodes)); return; } // 다시 누르면 해제
    var el = document.createElement(tag); el.appendChild(range.extractContents()); range.insertNode(el);
    sel.removeAllRanges(); var r2 = document.createRange(); r2.selectNodeContents(el); sel.addRange(r2);
  }
  tool.addEventListener('mousedown', function (e) { e.preventDefault(); }); // 글자 칸 선택 유지
  tool.addEventListener('click', function (e) {
    var b = e.target.closest('[data-c]'); if (!b || !cur) return;
    var c = b.dataset.c;
    if (c === 'b') wrap('b');
    else if (c === 'em') wrap('em');
    else if (c === 'small') wrap('small');
    else if (c === 'br') document.execCommand('insertHTML', false, '<br>');
    else if (c === 'plain') cur.innerHTML = cur.innerHTML.replace(/<(?!br\b)[^>]+>/gi, '');
    else if (c === 'reset') cur.innerHTML = cur.getAttribute('data-ehtml');
    else if (c === 'done') { cur.blur(); return; }
    place();
  });
  addEventListener('scroll', place, { passive: true }); addEventListener('resize', place);

  list.forEach(function (el) {
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'false');
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); document.execCommand('insertHTML', false, '<br>'); }
      else if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      else if (e.key === 'Escape') { el.innerHTML = el.getAttribute('data-ehtml-cur') || el.innerHTML; el.blur(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); wrap('b'); }
    });
    el.addEventListener('input', place);
    el.addEventListener('paste', function (e) { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text')); });
    el.addEventListener('focus', function () { cur = el; el.setAttribute('data-ehtml-cur', el.innerHTML); tool.hidden = false; place(); });
    el.addEventListener('blur', function () {
      tool.hidden = true; cur = null;
      var c = load(); c.texts = c.texts || {};
      var k = el.getAttribute('data-ek'), html = clean(el.innerHTML), orig = el.getAttribute('data-eorig'), origHtml = el.getAttribute('data-ehtml');
      if (html === clean(origHtml)) delete c.texts[k];
      else { c.texts[k] = { orig: orig, html: html, origHtml: origHtml, page: PAGE, at: new Date().toISOString() }; logLine(c, '문구 수정 ' + PAGE + ' — "' + norm(el.textContent).slice(0, 30) + '"'); }
      save(c); el.innerHTML = html || origHtml;
      var hits = RISKY.filter(function (r) { return r.test(el.textContent); });
      if (hits.length) { warn.hidden = false; warn.textContent = '⚠ 광고 위험 표현: "' + el.textContent.match(hits[0])[0] + '" — 관리자 > 문구 수정에서 확인'; } else warn.hidden = true;
      msg.textContent = '저장됨 ' + new Date().toTimeString().slice(0, 5);
      count();
    });
  });

  // ── 사진 바꾸기
  var file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*'; file.hidden = true; document.body.appendChild(file);
  var ibtn = document.createElement('button'); ibtn.className = 'eimgbtn'; ibtn.textContent = '📷 사진 바꾸기'; ibtn.hidden = true;
  var iundo = document.createElement('button'); iundo.className = 'eimgbtn undo'; iundo.textContent = '원래 사진'; iundo.hidden = true;
  document.body.appendChild(ibtn); document.body.appendChild(iundo);
  var curImg = null, hideT;
  function showImgBtn(im) {
    clearTimeout(hideT); curImg = im;
    var r = im.getBoundingClientRect(); if (r.width < 60) return;
    ibtn.style.top = Math.max(60, r.top + 10) + 'px'; ibtn.style.left = (r.left + 10) + 'px'; ibtn.hidden = false;
    var changed = (load().images || {})[im.getAttribute('data-eimg')];
    iundo.hidden = !changed; iundo.style.top = ibtn.style.top; iundo.style.left = (r.left + 130) + 'px';
  }
  function hideImgBtn() { hideT = setTimeout(function () { ibtn.hidden = true; iundo.hidden = true; }, 400); }
  pics.forEach(function (im) {
    // 이미지 위를 덮은 요소가 있어도 잡히게 부모 기준으로
    var host = im.parentElement;
    host.addEventListener('mouseenter', function () { showImgBtn(im); });
    host.addEventListener('mousemove', function () { if (curImg !== im) showImgBtn(im); });
    host.addEventListener('mouseleave', hideImgBtn);
  });
  [ibtn, iundo].forEach(function (b) { b.addEventListener('mouseenter', function () { clearTimeout(hideT); }); b.addEventListener('mouseleave', hideImgBtn); });
  ibtn.addEventListener('click', function () { file.value = ''; file.click(); });
  iundo.addEventListener('click', function () {
    if (!curImg) return; var c = load(); delete (c.images || {})[curImg.getAttribute('data-eimg')];
    logLine(c, '사진 되돌림 ' + PAGE); save(c); setPic(curImg, curImg.getAttribute('data-eorig-src'), false); iundo.hidden = true; msg.textContent = '원래 사진으로 되돌렸습니다'; count();
  });
  file.addEventListener('change', function () {
    var f = file.files[0]; if (!f || !curImg) return;
    var target = curImg, rd = new FileReader();
    rd.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = Math.min(1600, img.width), h = Math.round(img.height * w / img.width);
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h);
        var data = cv.toDataURL('image/jpeg', 0.8);
        var c = load(); c.images = c.images || {};
        c.images[target.getAttribute('data-eimg')] = { orig: target.getAttribute('data-eorig-src'), data: data, page: PAGE, name: f.name, at: new Date().toISOString() };
        logLine(c, '사진 교체 ' + PAGE + ' — ' + f.name);
        if (!save(c)) { msg.textContent = '저장 공간이 부족합니다(시안은 브라우저 저장). 더 작은 사진을 쓰세요'; return; }
        setPic(target, data, true); msg.textContent = '사진을 바꿨습니다 (' + Math.round(data.length / 1024) + 'KB)'; count();
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  });

  // 수정 중에는 링크·버튼으로 이동하지 않게
  document.addEventListener('click', function (e) { var a = e.target.closest('a,button'); if (a && !a.closest('.ebar,.etool') && a !== ibtn && a !== iundo && (a.tagName === 'A' || e.target.closest('[data-ek]'))) e.preventDefault(); }, true);
  bar.querySelector('[data-undo]').addEventListener('click', function () {
    if (!confirm('이 페이지에서 바꾼 문구·사진을 모두 원래대로 되돌릴까요?')) return;
    var c = load();
    Object.keys(c.texts || {}).forEach(function (k) { if (k.indexOf(PAGE + '|') === 0) delete c.texts[k]; });
    Object.keys(c.images || {}).forEach(function (k) { if (k.indexOf(PAGE + '|') === 0) delete c.images[k]; });
    save(c);
    $$('[data-ek]').forEach(function (el) { el.innerHTML = el.getAttribute('data-ehtml'); });
    pics.forEach(function (im) { setPic(im, im.getAttribute('data-eorig-src'), false); });
    count(); msg.textContent = '원래대로 되돌렸습니다';
  });
  var pop = document.getElementById('popup'); if (pop) pop.hidden = true;
  count();
})();
