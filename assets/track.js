/* 방문 기록(시안) — 어디서 들어와 어느 구간까지 보고 어디서 나갔는지, 어떤 호실을 들여다봤는지.
   이 브라우저 localStorage 에만 남기고 서버로 보내지 않는다(정식 오픈 때 GA4·그로스메이트 추적으로 같은 신호를 보냄).
   이름·연락처 같은 개인정보는 기록하지 않는다. 키: artera.events.v1(최근 3,000건) · artera.vid.v1(방문자 임의 번호) */
(function () {
  'use strict';
  var A = window.ARTERA || {}, BASE = A.base || '/';
  var EV = 'artera.events.v1', VID = 'artera.vid.v1', SK = 'artera.sess.v1', MAX = 3000, IDLE = 30 * 60 * 1000;
  var path = '/' + (location.pathname.indexOf(BASE) === 0 ? location.pathname.slice(BASE.length) : location.pathname.replace(/^\/+/, ''));
  path = path.replace(/index\.html$/, '');
  if (/^\/admin\//.test(path) || /[?&]edit=1/.test(location.search)) return; // 관리자·문구 수정 모드는 기록 안 함
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 공간 없음 */ } }
  function rid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

  // ── 출처: utm 값 → 직전 사이트(referrer) → 직접 방문 ──
  function classify() {
    var q = new URLSearchParams(location.search);
    var us = (q.get('utm_source') || '').toLowerCase(), um = (q.get('utm_medium') || '').toLowerCase(), uc = q.get('utm_campaign') || '';
    if (us) {
      var id = 'other';
      if (/naver/.test(us)) id = /cpc|ad|sa|paid|powerlink/.test(um) ? 'naver-ad' : /blog|cafe/.test(um) ? 'naver-blog' : 'naver';
      else if (/kakao/.test(us)) id = 'kakao';
      else if (/insta|facebook|meta|fb/.test(us)) id = 'meta';
      else if (/youtube|yt/.test(us)) id = 'youtube';
      else if (/google/.test(us)) id = 'google';
      else if (/richgo/.test(us)) id = 'richgo';
      else if (/sms|lms|mms|문자/.test(us)) id = 'sms';
      else if (/qr|banner|flyer|현수막|전단/.test(us)) id = 'qr';
      else if (/chatgpt|openai|perplexity|gemini/.test(us)) id = 'ai';
      return { src: id, camp: uc, how: 'utm' };
    }
    var host = '';
    try { host = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { host = ''; }
    if (!host) return { src: 'direct', camp: '', how: 'none' };
    if (host === location.hostname) return null; // 사이트 안 이동
    if (/blog\.naver|cafe\.naver|m\.blog/.test(host)) return { src: 'naver-blog', camp: '', how: 'ref' };
    if (/naver\.com/.test(host)) return { src: 'naver', camp: '', how: 'ref' };
    if (/kakao|daum\.net/.test(host)) return { src: 'kakao', camp: '', how: 'ref' };
    if (/instagram|facebook/.test(host)) return { src: 'meta', camp: '', how: 'ref' };
    if (/youtube|youtu\.be/.test(host)) return { src: 'youtube', camp: '', how: 'ref' };
    if (/richgo/.test(host)) return { src: 'richgo', camp: '', how: 'ref' };
    if (/chatgpt|openai|perplexity|gemini/.test(host)) return { src: 'ai', camp: '', how: 'ref' };
    if (/google\./.test(host)) return { src: 'google', camp: '', how: 'ref' };
    return { src: 'other', camp: host, how: 'ref' };
  }

  var vid = load(VID, null); if (!vid) { vid = rid(); save(VID, vid); }
  var now = Date.now(), cls = classify(), sess = null;
  try { sess = JSON.parse(sessionStorage.getItem(SK)); } catch (e) { sess = null; }
  var fresh = !sess || now - sess.last > IDLE || (cls && cls.how === 'utm' && (cls.src !== sess.src || cls.camp !== sess.camp));
  if (fresh) { var c = cls || { src: 'direct', camp: '' }; sess = { id: rid(), start: now, src: c.src, camp: c.camp, land: path }; }
  sess.last = now;
  try { sessionStorage.setItem(SK, JSON.stringify(sess)); } catch (e) { /* 무시 */ }

  var pv = rid();
  function push(e, x) {
    var list = load(EV, []);
    list.push({ t: new Date().toISOString(), v: vid, s: sess.id, src: sess.src, c: sess.camp || undefined, e: e, p: path, pv: pv, x: x || undefined });
    if (list.length > MAX) list = list.slice(list.length - MAX);
    save(EV, list);
  }
  window.ARTERA_TRACK = { push: push, session: sess, path: path };
  if (fresh) push('start', { land: path });
  push('pv', {});
  var um = /^\/units\/(\d{3})\/$/.exec(path);
  if (um) push('unit', { no: um[1], how: 'page' });

  // ── 구간 도달: 홈은 정해 둔 이름, 다른 쪽은 구간 제목(h2) ──
  var NAMES = { hero: '첫 화면', benefit: '혜택 3가지', status: '입점 현황', drone: '조감 영상', premium5: '프리미엄', map: '배치도', location: '입지', price: '분양가', news: '소식', quick: '상담 신청', faq: '자주 묻는 질문' };
  function keyOf(el) {
    if (el.matches('.hero')) return 'hero';
    if (el.matches('.faq')) return 'faq';
    return el.id || '';
  }
  function nameOf(el, i) {
    var k = keyOf(el);
    if (NAMES[k]) return NAMES[k];
    if (el.matches('.phead')) return '쪽 머리';
    var h = el.querySelector('h2,h1');
    return h ? h.textContent.replace(/\s+/g, ' ').trim().slice(0, 24) : '구간 ' + (i + 1);
  }
  var secs = Array.prototype.slice.call(document.querySelectorAll('main > section, main > header'));
  var seen = {}, last = secs.length ? nameOf(secs[0], 0) : '첫 화면', lastI = 0, maxScroll = 0;
  if ('IntersectionObserver' in window && secs.length) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (en.intersectionRatio < 0.35 && en.intersectionRect.height < innerHeight * 0.5) return;
        var i = secs.indexOf(en.target), n = nameOf(en.target, i);
        if (i >= lastI) { last = n; lastI = i; }
        if (seen[n]) return;
        seen[n] = 1;
        push('sec', { n: n, i: i, of: secs.length });
      });
    }, { threshold: [0, 0.2, 0.35, 0.5] });
    secs.forEach(function (s) { io.observe(s); });
  }
  addEventListener('scroll', function () {
    var h = document.documentElement, p = Math.round((h.scrollTop + innerHeight) / Math.max(1, h.scrollHeight) * 100);
    if (p > maxScroll) maxScroll = Math.min(100, p);
  }, { passive: true });
  var left = false;
  function leave() { if (left) return; left = true; push('leave', { last: last, dur: Date.now() - now, scroll: maxScroll }); }
  addEventListener('pagehide', leave);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') leave(); else left = false; });

  // ── 호실 관심: 배치도에서 0.7초 이상 올려 둔 호실·누른 호실 (같은 쪽에서 호실당 한 번) ──
  var unitSeen = {}, hoverT = {};
  function unit(no, how) { if (!no || unitSeen[no]) return; unitSeen[no] = 1; push('unit', { no: no, how: how }); }
  Array.prototype.forEach.call(document.querySelectorAll('[data-fp] .u'), function (g) {
    var no = g.getAttribute('data-no');
    g.addEventListener('mouseenter', function () { hoverT[no] = setTimeout(function () { unit(no, 'hover'); }, 700); });
    g.addEventListener('mouseleave', function () { clearTimeout(hoverT[no]); });
    g.addEventListener('click', function () { unit(no, 'tap'); });
  });

  // ── 누름: 전화·관심고객등록·호실 문의 ──
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]'); if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/^tel:/.test(href)) { push('call', { where: a.className.split(' ')[0] || '' }); return; }
    var m = /[?&]unit=(\d{3})/.exec(href);
    if (/register\//.test(href)) push('reg_click', { unit: m ? m[1] : undefined });
  }, true);

  // ── 상담 폼: 처음 칸을 누른 순간 · 접수 완료(성공 문구가 뜬 순간) ──
  Array.prototype.forEach.call(document.querySelectorAll('[data-form]'), function (f) {
    var started = false;
    f.addEventListener('focusin', function () { if (started) return; started = true; push('form_start', { form: f.getAttribute('data-form') }); });
    f.addEventListener('submit', function () {
      setTimeout(function () {
        var msg = f.querySelector('[data-msg]');
        if (msg && /\bok\b/.test(msg.className)) {
          var kind = (f.querySelector('.on[data-kind]') || {}).getAttribute ? f.querySelector('.on[data-kind]').getAttribute('data-kind') : '';
          push('form_submit', { form: f.getAttribute('data-form'), kind: kind || (f.elements.kind && f.elements.kind.value) || '' });
        }
      }, 0);
    });
  });
})();
