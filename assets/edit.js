/* 문구 바로 고치기 — 관리자가 고친 문구 적용(모든 방문자) + 수정 모드(관리자) */
(function () {
  'use strict';
  var KEY = 'artera.cms.v1', TOKEN = 'artera.edit.token';
  var B = document.body.getAttribute('data-base') || '/';
  var PAGE = location.pathname.replace(B, '/') || '/';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} }
  var norm = function (s) { return String(s || '').replace(/\s+/g, ' ').trim(); };

  // 고칠 수 있는 글자 (숫자 애니메이션·자동 갱신 영역·폼·지도는 제외)
  var SEL = 'main h1, main h2, main h3, main p, main li, main dt, main dd, main th, main td, main figcaption, main .btn, main .hero-kicker, main .zone-h, main .eyebrow, .ft-legal, .ft-addr';
  var SKIP = '[data-cells],[data-stats],[data-brands],[data-panel],[data-live-summary],[data-legend],[data-count],.calc-out,form,svg,[data-news-latest],[data-news-list],.fp-tip,[data-cell-status],.hero-h .days,.consent,.crumb';
  function editables() {
    return $$(SEL).filter(function (el) {
      if (el.closest(SKIP)) return false;
      if (el.querySelector('[data-count-to],input,select,textarea,img,svg,table,ul,ol,p,div,h1,h2,h3,li,figure')) return false;
      if (el.hasAttribute('data-count-to')) return false;
      return norm(el.textContent).length > 0;
    });
  }
  // 허용 태그만 남기기 (em·b·strong·small·br)
  function clean(html) {
    var box = document.createElement('div'); box.innerHTML = html;
    (function walk(n) {
      $$('*', n).reverse().forEach(function (el) {
        if (['EM', 'B', 'STRONG', 'SMALL', 'BR'].indexOf(el.tagName) < 0) { el.replaceWith.apply(el, Array.prototype.slice.call(el.childNodes)); }
        else { Array.prototype.slice.call(el.attributes).forEach(function (a) { el.removeAttribute(a.name); }); }
      });
    })(box);
    return box.innerHTML.replace(/&nbsp;/g, ' ').trim();
  }

  // 1) 고친 문구 적용 (원래 문구가 같을 때만 — 페이지 구조가 바뀌어도 엉뚱한 곳에 안 들어가게)
  var cms = load(), texts = cms.texts || {};
  var list = editables();
  list.forEach(function (el, i) {
    var k = PAGE + '|' + i, t = texts[k];
    el.setAttribute('data-ek', k);
    el.setAttribute('data-eorig', norm(el.textContent));
    el.setAttribute('data-ehtml', el.innerHTML);
    var o = norm(el.textContent), ai = texts[PAGE + '|*|' + o];
    if (t && t.orig === o) el.innerHTML = t.html;
    else if (ai) el.innerHTML = ai.html;
  });

  // 2) 수정 모드: 관리자에서 연 경우만 (12시간 안에 발급한 표시)
  var params = new URLSearchParams(location.search);
  var tok = 0; try { tok = Number(localStorage.getItem(TOKEN) || 0); } catch (e) {}
  if (params.get('edit') !== '1' || Date.now() - tok > 12 * 3600 * 1000) return;

  var RISKY = [/최저가|가장 싸|가장 저렴/, /최고|유일|독보적|압도적|1위/, /두\s?번\s?다시|마지막 기회|곧 마감|완판/, /보장|확정\s?수익|무조건|100\s?%|평생 임대/, /입점\s?확정|출점\s?확정/, /지금이 (가장|제일)|오를 수밖에|시세 차익/];
  var style = document.createElement('style');
  style.textContent = '.ebar{position:fixed;left:0;right:0;top:0;z-index:400;background:#141A45;color:#fff;display:flex;gap:14px;align-items:center;padding:10px 18px;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,.25);flex-wrap:wrap}.ebar b{color:#FF7A45}.ebar button,.ebar a{background:#fff;color:#141A45;border:0;padding:7px 12px;font-weight:800;border-radius:3px;cursor:pointer;font:inherit;font-weight:800;text-decoration:none}.ebar .x{background:#F15A24;color:#fff}.ebar .msg{margin-left:auto;opacity:.85}.ebar .warn{background:#FFF0D6;color:#7A4A00;padding:4px 10px;border-radius:3px;font-weight:700}body.editing{padding-top:52px}body.editing .hd{top:52px}body.editing [data-ek]{outline:1px dashed rgba(241,90,36,.55);outline-offset:2px;cursor:text}body.editing [data-ek]:hover{outline:2px solid #F15A24;background:rgba(241,90,36,.06)}body.editing [data-ek]:focus{outline:2px solid #1F2761;background:#fff;color:#161B35}body.editing [data-ek].changed{outline:2px solid #2D8FD0}body.editing .reveal{opacity:1;transform:none}';
  document.head.appendChild(style);
  document.body.classList.add('editing');
  var bar = document.createElement('div'); bar.className = 'ebar';
  bar.innerHTML = '<span>✎ <b>문구 수정 모드</b> — 글자를 눌러 바로 고치세요. 다른 곳을 누르면 저장됩니다.</span><span data-cnt></span><span class="warn" data-warn hidden></span><span class="msg" data-msg></span><button data-undo>이 페이지 원래대로</button><a class="x" href="' + location.pathname + '">수정 끝내기</a>';
  document.body.appendChild(bar);
  var msg = bar.querySelector('[data-msg]'), warn = bar.querySelector('[data-warn]');
  function count() {
    var c = load().texts || {}, n = Object.keys(c).filter(function (k) { return k.indexOf(PAGE + '|') === 0; }).length;
    bar.querySelector('[data-cnt]').textContent = '이 페이지에서 바꾼 곳 ' + n + '개';
    $$('[data-ek]').forEach(function (el) { el.classList.toggle('changed', !!c[el.getAttribute('data-ek')]); });
  }
  list.forEach(function (el) {
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'false');
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); } if (e.key === 'Escape') { el.innerHTML = el.getAttribute('data-ehtml-cur') || el.innerHTML; el.blur(); } });
    el.addEventListener('focus', function () { el.setAttribute('data-ehtml-cur', el.innerHTML); });
    el.addEventListener('blur', function () {
      var c = load(); c.texts = c.texts || {};
      var k = el.getAttribute('data-ek'), html = clean(el.innerHTML), orig = el.getAttribute('data-eorig');
      if (norm(el.textContent) === orig) { delete c.texts[k]; }
      else {
        c.texts[k] = { orig: orig, html: html, origHtml: el.getAttribute('data-ehtml'), page: PAGE, at: new Date().toISOString() };
        c.log = c.log || []; c.log.unshift({ at: new Date().toISOString(), text: '문구 수정 ' + PAGE + ' — "' + norm(el.textContent).slice(0, 30) + '"' }); c.log = c.log.slice(0, 50);
      }
      save(c); el.innerHTML = html || el.getAttribute('data-ehtml');
      var hits = RISKY.filter(function (r) { return r.test(el.textContent); });
      if (hits.length) { warn.hidden = false; warn.textContent = '⚠ 광고 위험 표현이 들어 있습니다: "' + el.textContent.match(hits[0])[0] + '" — 관리자 > 문구 수정에서 확인'; }
      else warn.hidden = true;
      msg.textContent = '저장됨 ' + new Date().toTimeString().slice(0, 5);
      count();
    });
  });
  // 수정 중에는 링크로 이동하지 않게
  document.addEventListener('click', function (e) { var a = e.target.closest('a,button'); if (a && !a.closest('.ebar') && (a.tagName === 'A' || e.target.closest('[data-ek]'))) e.preventDefault(); }, true);
  bar.querySelector('[data-undo]').addEventListener('click', function () {
    if (!confirm('이 페이지에서 바꾼 문구를 모두 원래대로 되돌릴까요?')) return;
    var c = load(); Object.keys(c.texts || {}).forEach(function (k) { if (k.indexOf(PAGE + '|') === 0) delete c.texts[k]; });
    save(c); $$('[data-ek]').forEach(function (el) { el.innerHTML = el.getAttribute('data-ehtml'); }); count(); msg.textContent = '원래대로 되돌렸습니다';
  });
  var pop = document.getElementById('popup'); if (pop) pop.hidden = true;
  count();
})();
