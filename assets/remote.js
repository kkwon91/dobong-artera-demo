/* 도봉 아테라 — 운영 서버 연결 (11-09)
   상담 신청 · 방문 기록을 한 주소(구글 Apps Script 웹 앱)로 보내고, 관리자는 로그인해서 읽는다.
   서버를 바꿔도(예: 그로스AX) 같은 규약이면 아래 URL 한 줄만 바꾸면 된다.
   규약: POST(text/plain JSON) {a:'inq'|'ev'|'login'|'admin', ...} → JSON */
(function () {
  'use strict';
  var URL_ = ''; // ← 웹 앱 주소(https://script.google.com/macros/s/…/exec)
  var SITE = 'dbartera'; // 여러 홈페이지를 한 서버로 모을 때 쓰는 사이트 번호(지금 서버는 무시)
  try { if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && localStorage.getItem('artera.remote.url')) URL_ = localStorage.getItem('artera.remote.url'); } catch (e) {}
  var TOK = 'artera.admin.token';

  function timeout(p, ms) { return new Promise(function (ok, no) { var t = setTimeout(function () { no(new Error('timeout')); }, ms); p.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); no(e); }); }); }
  function post(body, ms) {
    if (!URL_) return Promise.reject(new Error('no-server'));
    body.site = SITE;
    return timeout(fetch(URL_, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' }).then(function (r) { return r.json(); }), ms || 20000);
  }

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
    if (!URL_ || !queue.length) return;
    var body = JSON.stringify({ a: 'ev', site: SITE, events: queue.splice(0, 200) });
    if (beacon && navigator.sendBeacon) { try { if (navigator.sendBeacon(URL_, new Blob([body], { type: 'text/plain;charset=utf-8' }))) return; } catch (e) { /* 아래로 */ } }
    try { fetch(URL_, { method: 'POST', body: body, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, keepalive: true, redirect: 'follow' }).catch(function () {}); } catch (e) { /* 무시 */ }
  }
  function event(ev) {
    if (!URL_) return;
    queue.push(ev);
    if (queue.length >= 30) flush(false);
    else if (!flushT) flushT = setTimeout(function () { flush(false); }, 15000);
  }

  window.ARTERA_REMOTE = {
    on: !!URL_,
    inquiry: function (d) { return post({ a: 'inq', data: d }, 20000).then(function (r) { if (!r || !r.ok) throw new Error((r && r.err) || 'fail'); return r; }); },
    event: event, flush: flush,
    login: function (id, pw) { return post({ a: 'login', id: id, pw: pw }, 20000).then(function (r) { if (r && r.ok && r.token) setToken(r.token); return r; }); },
    token: token, clearToken: clearToken,
    admin: admin
  };
})();
