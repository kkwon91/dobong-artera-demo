/* 도봉 아테라 — 사이트 운영 서버 연결 (11-09)
   상담 신청 · 방문 기록 · 관리자 로그인을 우리 '사이트 운영 서버'(여러 사이트 공용, 사이트 번호로 구분)로 보낸다.
   킬 스위치: 서버가 이 사이트를 '정지/종료'라고 답하면 화면을 닫고 GA·기록을 멈춘다(서버가 안 닿으면 그대로 둠).
   규약: GET ?a=status&site=… · POST(text/plain JSON) {a:'inq'|'ev'|'login'|'admin', site, …} → JSON */
(function () {
  'use strict';
  var URL_ = ''; // ← 고정 주소가 생기면 여기에(https://…/). 비어 있으면 assets/server.json 에서 지금 주소를 읽음(터널이 바뀔 때 자동 갱신)
  var SITE = 'dbartera';
  var GA_ID = ''; // ← GA4 측정 ID(G-XXXXXXX). 비우면 GA 안 붙음
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  try { if (LOCAL) { URL_ = localStorage.getItem('artera.remote.url') || URL_; GA_ID = localStorage.getItem('artera.ga.id') || ''; } } catch (e) {}
  var TOK = 'artera.admin.token', ST = 'artera.site.status', SV = 'artera.server.url';
  var ADMIN = /\/admin\//.test(location.pathname);
  var closed = false;

  function timeout(p, ms) { return new Promise(function (ok, no) { var t = setTimeout(function () { no(new Error('timeout')); }, ms); p.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); no(e); }); }); }
  // 서버 주소: 고정 주소 → 이번 방문에 읽어 둔 주소(5분) → /assets/server.json
  var baseP = null;
  function base() {
    if (URL_) return Promise.resolve(URL_);
    if (baseP) return baseP;
    var c = null; try { c = JSON.parse(sessionStorage.getItem(SV)); } catch (e) {}
    if (c && c.url && Date.now() - c.at < 300000) { URL_ = c.url; return Promise.resolve(URL_); }
    if (LOCAL) return Promise.reject(new Error('no-server'));
    baseP = timeout(fetch('/assets/server.json?_=' + Math.floor(Date.now() / 60000), { cache: 'no-cache' }).then(function (r) { return r.json(); }), 4000).then(function (j) {
      if (!j || !/^https:\/\//.test(j.url || '')) throw new Error('no-server');
      URL_ = j.url; try { sessionStorage.setItem(SV, JSON.stringify({ url: URL_, at: Date.now() })); } catch (e) {}
      return URL_;
    });
    baseP.catch(function () { baseP = null; });
    return baseP;
  }
  function post(body, ms) {
    if (closed) return Promise.reject(new Error('closed'));
    body.site = SITE;
    return base().then(function (u) {
      return timeout(fetch(u, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' } }).then(function (r) { return r.json(); }), ms || 20000);
    }).then(function (r) { if (r && r.err === 'closed') { shut(); throw new Error('closed'); } return r; });
  }

  // ── 킬 스위치: 운영 종료 화면 ──
  function shut() {
    if (closed) return; closed = true;
    try { sessionStorage.setItem(ST, JSON.stringify({ at: Date.now(), status: 'closed' })); } catch (e) {}
    if (ADMIN) return; // 관리자는 로그인 단계에서 안내
    var go = function () {
      Array.prototype.forEach.call(document.querySelectorAll('video'), function (v) { try { v.pause(); } catch (e) {} });
      var d = document.createElement('div');
      d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', '운영 종료 안내');
      d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#fff;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font:600 18px/1.6 system-ui,-apple-system,"Malgun Gothic",sans-serif;color:#1F2761';
      d.innerHTML = '<div><p style="margin:0 0 8px;font-size:22px;font-weight:800">운영이 종료된 홈페이지입니다</p><p style="margin:0;font-weight:500;font-size:15px;color:#5A6178">방문해 주셔서 감사합니다.</p></div>';
      document.body.appendChild(d); document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
    };
    if (document.body) go(); else addEventListener('DOMContentLoaded', go);
  }
  // ── GA4: 사이트가 살아 있을 때만 붙임 ──
  function loadGa() {
    if (!GA_ID || closed || window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', GA_ID);
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID); document.head.appendChild(s);
  }
  (function check() {
    var c = null; try { c = JSON.parse(sessionStorage.getItem(ST)); } catch (e) {}
    if (c && Date.now() - c.at < 600000) { if (c.status !== 'active') shut(); else if (!ADMIN) loadGa(); return; }
    timeout(base().then(function (u) { return fetch(u + '?a=status&site=' + SITE); }).then(function (r) { return r.json(); }), 3500).then(function (r) {
      if (r && r.ok && r.status && r.status !== 'active') return shut();
      try { sessionStorage.setItem(ST, JSON.stringify({ at: Date.now(), status: 'active' })); } catch (e) {}
      if (!ADMIN) loadGa();
    }, function () { if (!ADMIN) loadGa(); }); // 서버가 안 닿으면 화면은 그대로(문의는 전화 안내)
  })();

  // ── 관리자 열쇠(12시간, 서버가 서명) ──
  function tokenExp(t) { var n = Number(String(t || '').split('.')[0]); return n > 0 ? n : 0; }
  function token() { var t = ''; try { t = sessionStorage.getItem(TOK) || ''; } catch (e) {} return tokenExp(t) > Date.now() ? t : ''; }
  function setToken(t) { try { sessionStorage.setItem(TOK, t); } catch (e) {} }
  function clearToken() { try { sessionStorage.removeItem(TOK); } catch (e) {} }
  function admin(op, x, ms) {
    var t = token();
    if (!t) return Promise.reject(new Error('login'));
    return post(Object.assign({ a: 'admin', token: t, op: op }, x || {}), ms || 30000).then(function (r) {
      if (r && r.err === 'login') { clearToken(); throw new Error('login'); }
      return r;
    });
  }

  // ── 방문 기록: 모아 두었다가 묶어서 보냄(이름·연락처 없음) ──
  var queue = [], flushT = 0;
  function flush(beacon) {
    clearTimeout(flushT); flushT = 0;
    if (closed || !queue.length) return;
    if (!URL_) { if (!beacon) base().then(function () { flush(false); }, function () { queue.length = 0; }); return; } // 주소를 찾은 뒤 보냄
    var body = JSON.stringify({ a: 'ev', site: SITE, events: queue.splice(0, 200) });
    if (beacon && navigator.sendBeacon) { try { if (navigator.sendBeacon(URL_, new Blob([body], { type: 'text/plain;charset=utf-8' }))) return; } catch (e) { /* 아래로 */ } }
    try { fetch(URL_, { method: 'POST', body: body, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, keepalive: true }).catch(function () {}); } catch (e) { /* 무시 */ }
  }
  function event(ev) {
    if (closed || (LOCAL && !URL_)) return;
    queue.push(ev);
    if (queue.length >= 30) flush(false);
    else if (!flushT) flushT = setTimeout(function () { flush(false); }, 15000);
  }

  window.ARTERA_REMOTE = {
    on: !!URL_ || !LOCAL, // 운영에서는 server.json 으로 주소를 찾음(못 찾으면 각 요청이 실패로 끝나 전화 안내)
    closed: function () { return closed; },
    inquiry: function (d) { return post({ a: 'inq', data: d }, 20000).then(function (r) { if (!r || !r.ok) throw new Error((r && r.err) || 'fail'); return r; }); },
    event: event, flush: flush,
    login: function (id, pw) { return post({ a: 'login', id: id, pw: pw }, 20000).then(function (r) { if (r && r.ok && r.token) setToken(r.token); return r; }); },
    token: token, clearToken: clearToken,
    admin: admin
  };
})();
