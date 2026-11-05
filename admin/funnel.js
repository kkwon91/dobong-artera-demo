/* 관리자 · 방문 분석 — 퍼널·구간 이탈·출처·관심 호실
   실제 기록 = 홈페이지 assets/track.js 가 이 브라우저에 남긴 것(artera.events.v1)
   예시 = 씨앗 고정 생성기(14일). 화면 모든 숫자에 '예시' 표시. 정식 오픈 때 GA4·그로스메이트 수집으로 교체 */
(function () {
  'use strict';
  window.ARTERA_ADMIN_EXT = window.ARTERA_ADMIN_EXT || [];
  window.ARTERA_ADMIN_EXT.push(function (K) {
    var A = K.A, esc = K.esc, $ = K.$, $$ = K.$$;
    var EV = 'artera.events.v1', UI = 'artera.funnel.ui';
    var BLUE = '#4157C4', ORANGE = '#F15A24'; // validate_palette 통과(밝기·색맹 구분·대비)
    var HEAT = ['#EAEEFB', '#C5D0F2', '#97A9E6', '#6681D6', '#4157C4', '#2A3A8F']; // 한 색 밝음→어두움
    var SRC = { 'naver-ad': '네이버 검색광고', naver: '네이버 검색', 'naver-blog': '네이버 블로그·카페', kakao: '카카오', meta: '인스타·페이스북', youtube: '유튜브', google: '구글', richgo: '리치고 앱', sms: '문자', qr: '현수막·전단 QR', ai: 'AI 검색', direct: '직접 방문', other: '기타 사이트' };
    var SECS = ['첫 화면', '혜택 3가지', '입점 현황', '조감 영상', '프리미엄', '배치도', '입지', '분양가', '소식', '상담 신청', '자주 묻는 질문'];
    var ui = (function () { try { return Object.assign({ days: 14, data: 'all' }, JSON.parse(localStorage.getItem(UI)) || {}); } catch (e) { return { days: 14, data: 'all' }; } })();
    function saveUi() { try { localStorage.setItem(UI, JSON.stringify(ui)); } catch (e) { /* 무시 */ } }
    function P(x) { var v = (x || 0) * 100; return (v > 0 && v < 10 ? v.toFixed(1) : String(Math.round(v))) + '%'; }
    function N(x) { return Number(x || 0).toLocaleString('ko-KR'); }
    function md(ms) { var d = new Date(ms + 9 * 3600e3); return (d.getUTCMonth() + 1) + '.' + d.getUTCDate(); }
    function ymd(ms) { return new Date(ms + 9 * 3600e3).toISOString().slice(0, 10); }
    function jo(w, a, b) { var c = String(w).charCodeAt(String(w).length - 1); return w + ((c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28) ? a : b); }
    function stOf(no) { var s = K.stateOf(no), c = K.colorOf(s); return { s: s, c: c }; }

    // ── 씨앗 고정 난수 ──
    function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function pick(r, pairs) { var tot = pairs.reduce(function (s, p) { return s + p[1]; }, 0), x = r() * tot; for (var i = 0; i < pairs.length; i++) { x -= pairs[i][1]; if (x <= 0) return pairs[i][0]; } return pairs[pairs.length - 1][0]; }

    // ── 예시 방문 기록 (같은 날짜면 매번 같은 결과) ──
    // 출처별 성향: [비중, 끝까지 내려보는 정도, 문의 성향]
    var MIX = { 'naver-ad': [28, 0.86, 0.9], naver: [17, 1.0, 1.25], 'naver-blog': [10, 1.02, 1.0], kakao: [11, 0.92, 1.0], meta: [9, 0.72, 0.45], richgo: [7, 1.08, 1.3], sms: [5, 1.0, 1.9], qr: [4, 0.94, 1.1], direct: [6, 1.05, 1.5], ai: [1.6, 1.1, 1.4], google: [1.4, 0.95, 1.0] };
    var CONT = [0.74, 0.88, 0.83, 0.86, 0.84, 0.82, 0.86, 0.66, 0.84, 0.74]; // 다음 구간으로 넘어갈 확률(첫 화면→혜택 …)
    function unitWeights() {
      return A.units.map(function (u) {
        var s = K.stateOf(u.no), w = Math.sqrt(u.exP);
        w *= s.lease === 'open' ? (s.sale === 'sold' ? 0.5 : 1.35) : s.lease === 'leased' ? 1.25 : s.lease === 'loi' ? 0.9 : 0.55;
        if (/^(114|115|116|117|101|109|201|204)$/.test(u.no)) w *= 1.35; // 모서리·대형 호실
        return [u.no, w];
      });
    }
    function genExample(days) {
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var end = today.getTime() + 864e5, start = end - days * 864e5, out = [];
      var r = rng(Number(ymd(today.getTime()).replace(/-/g, '')) * 7 + days), UW = unitWeights();
      var srcPairs = Object.keys(MIX).map(function (k) { return [k, MIX[k][0]]; });
      for (var d = 0; d < days; d++) {
        var day0 = start + d * 864e5, dow = new Date(day0).getDay();
        var n = Math.round((150 + r() * 70) * (dow === 0 ? 0.78 : dow === 6 ? 1.15 : 1) * (1 + d * 0.012));
        for (var i = 0; i < n; i++) {
          var src = pick(r, srcPairs), m = MIX[src], sid = 'ex' + d + '_' + i, vid = 'xv' + Math.floor(r() * 1e9).toString(36);
          var t = day0 + (9 + r() * 13) * 3600e3, ev = [];
          var push = function (e, p, x) { ev.push({ t: t, s: sid, v: vid, src: src, e: e, p: p, x: x }); t += 4000 + r() * 30000; };
          var land = pick(r, [['/', 80], ['/floorplan/', 8], ['/premium/', 5], ['/units/', 4], ['/news/', 3]]);
          if (land === '/units/') land = '/units/' + pick(r, UW) + '/';
          push('start', land, { land: land });
          var reachedMap = false, reach = 0, last = '첫 화면';
          if (land === '/') {
            push('pv', '/');
            for (var k = 0; k < SECS.length; k++) {
              push('sec', '/', { n: SECS[k], i: k });
              reach = k; last = SECS[k];
              if (SECS[k] === '배치도') reachedMap = true;
              if (k < CONT.length && r() > Math.min(0.97, CONT[k] * m[1])) break;
            }
          } else { push('pv', land); reachedMap = land === '/floorplan/'; if (/^\/units\//.test(land)) push('unit', land, { no: land.slice(7, 10), how: 'page' }); }
          var units = [];
          if (reachedMap) { var nu = Math.floor(r() * (src === 'richgo' ? 6 : 4.4)); for (var j = 0; j < nu; j++) { var no = pick(r, UW); if (units.indexOf(no) < 0) { units.push(no); push('unit', land === '/' ? '/' : land, { no: no, how: 'hover' }); } } }
          push('leave', land, { last: last, dur: 6000 + reach * 9000 + r() * 20000 });
          // 더 둘러보기
          if (units.length && r() < 0.18) { var up = '/units/' + units[0] + '/'; push('pv', up); push('unit', up, { no: units[0], how: 'page' }); push('leave', up, { last: '쪽 머리', dur: 20000 + r() * 40000 }); }
          if (reach >= 4 && r() < 0.1) { push('pv', '/premium/'); push('leave', '/premium/', { last: '수익률 계산기', dur: 30000 + r() * 60000 }); }
          // 문의
          var c = m[2] * (units.length ? 1.25 : 0.8);
          var deep = reach >= 7 || land !== '/';
          if (deep && r() < 0.035 * c) push('call', land, {});
          var formAt = reach >= 9 ? '/' : (units.length && r() < 0.07 * c) ? '/register/' : '';
          if (formAt === '/register/') push('pv', '/register/');
          if (formAt && r() < (formAt === '/' ? 0.17 : 0.55) * c) {
            push('form_start', formAt, {});
            if (r() < 0.5) push('form_submit', formAt, { kind: pick(r, [['invest', 6], ['lease', 3], ['agent', 1]]) });
          }
          Array.prototype.push.apply(out, ev);
        }
      }
      return out;
    }

    // ── 실제 기록 ──
    function real(days) {
      var since = Date.now() - days * 864e5, list = [];
      try { list = JSON.parse(localStorage.getItem(EV)) || []; } catch (e) { list = []; }
      return list.map(function (e) { return { t: +new Date(e.t), s: 'r_' + e.s, v: e.v, src: e.src, e: e.e, p: e.p, x: e.x || {} }; }).filter(function (e) { return e.t >= since; });
    }
    // ── 방문(세션)으로 묶기 ──
    function sessionize(events) {
      var by = {};
      events.forEach(function (e) { (by[e.s] = by[e.s] || []).push(e); });
      // 쪽 보기(pv)가 없는 방문(앞 쪽의 '나감'만 남은 조각)은 빼고 셈
      return Object.keys(by).filter(function (id) { return by[id].some(function (e) { return e.e === 'pv'; }); }).map(function (id) {
        var ev = by[id].sort(function (a, b) { return a.t - b.t; }), S = { id: id, ex: id.indexOf('ex') === 0, src: ev[0].src || 'direct', t: ev[0].t, land: (ev[0].x && ev[0].x.land) || ev[0].p, pv: 0, secs: {}, maxI: -1, units: [], call: 0, fs: 0, sub: 0, dur: 0, last: '', lastP: '' };
        ev.forEach(function (e) {
          if (e.e === 'pv') S.pv++;
          if (e.e === 'sec' && e.p === '/') { S.secs[e.x.n] = 1; var i = SECS.indexOf(e.x.n); if (i > S.maxI) S.maxI = i; }
          if (e.e === 'unit' && S.units.indexOf(e.x.no) < 0) S.units.push(e.x.no);
          if (e.e === 'call') S.call++;
          if (e.e === 'form_start') S.fs++;
          if (e.e === 'form_submit') S.sub++;
          if (e.e === 'leave') { S.dur += e.x.dur || 0; S.last = e.x.last; S.lastP = e.p; }
          if (e.p === '/floorplan/') S.fp = 1;
        });
        S.pv = Math.max(1, S.pv);
        S.bounce = S.pv === 1 && S.maxI <= 0 && !S.units.length && !S.fs && !S.call;
        return S;
      });
    }

    // ── 계산 ──
    var STEPS = [
      ['방문', function () { return true; }],
      ['입점 현황까지 봄', function (S) { return S.maxI >= 2 || S.fp || S.units.length > 0; }],
      ['호실을 들여다봄', function (S) { return S.units.length > 0; }],
      ['문의 행동(상담 입력·전화)', function (S) { return S.fs > 0 || S.call > 0; }],
      ['상담 신청 완료', function (S) { return S.sub > 0; }]
    ];
    function funnel(list) {
      var cur = list, out = [];
      STEPS.forEach(function (st) { cur = cur.filter(st[1]); out.push({ name: st[0], n: cur.length }); });
      return out;
    }
    function secRows(list) {
      var home = list.filter(function (S) { return S.land === '/'; }), n = home.length || 1;
      return SECS.map(function (name, i) {
        var reached = home.filter(function (S) { return S.maxI >= i; }).length;
        var exits = home.filter(function (S) { return S.maxI === i && S.pv === 1 && !S.sub; }).length;
        return { name: name, reach: reached / n, exit: exits / n, exitN: exits, reachN: reached };
      });
    }
    function srcRows(list) {
      var g = {};
      list.forEach(function (S) { var r = g[S.src] = g[S.src] || { src: S.src, n: 0, b: 0, u: 0, sub: 0, call: 0 }; r.n++; if (S.bounce) r.b++; if (S.units.length) r.u++; if (S.sub) r.sub++; if (S.call) r.call++; });
      return Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return b.n - a.n; });
    }
    function unitStats(list) {
      var u = {};
      A.units.forEach(function (x) { u[x.no] = { no: x.no, n: 0, sub: 0 }; });
      list.forEach(function (S) { S.units.forEach(function (no) { if (u[no]) { u[no].n++; if (S.sub) u[no].sub++; } }); });
      return u;
    }
    function daily(list, days) {
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var rows = [];
      for (var d = days - 1; d >= 0; d--) { var t0 = today.getTime() - d * 864e5; rows.push({ t: t0, n: 0, sub: 0 }); }
      list.forEach(function (S) { var i = Math.floor((S.t - rows[0].t) / 864e5); if (rows[i]) { rows[i].n++; if (S.sub) rows[i].sub++; } });
      return rows;
    }

    // ── 진단 문장(규칙 기반 · AI 비용 없음) ──
    var STEP_FIX = {
      1: '첫 화면에서 아래로 내려가지 않습니다. 첫 화면 바로 아래에 "영업 중 6실·LOI 4건" 같은 입점 숫자를 먼저 보여 주세요.',
      2: '입점 현황은 보지만 호실을 누르지 않습니다. 배치도 안내 문구를 "관심 있는 호실을 눌러 보세요"로 더 크게 하고, 입점 현황 표의 칸을 누르면 바로 그 호실로 가게 하세요.',
      3: '호실은 보지만 문의로 이어지지 않습니다. 호실 정보 칸의 "이 호실 투자 문의" 버튼을 먼저 보이게 하고, 휴대폰에서는 아래 고정 버튼에 호실 번호를 넣어 주세요.',
      4: '상담 칸을 열고도 끝까지 보내지 않습니다. 입력 칸을 이름·연락처 두 개로 줄이고, 개인정보 동의 문구를 한 줄로 줄여 보세요.'
    };
    var SEC_FIX = {
      '첫 화면': '첫 화면 영상이 늦게 뜨면 바로 나갑니다. 휴대폰용 영상 용량을 더 줄이거나 사진을 먼저 보여 주세요.',
      '혜택 3가지': '혜택 띠 다음이 바로 길게 이어집니다. 혜택 문구를 누르면 해당 설명으로 바로 가는지 확인하세요.',
      '입점 현황': '입점 현황 표가 길어 지루할 수 있습니다. 숫자 네 칸을 위로 올리고 브랜드 칸은 접어 두는 안을 시험해 보세요.',
      '조감 영상': '영상 구간이 길게 느껴질 수 있습니다. 높이를 줄여 다음 구간이 살짝 보이게 해 보세요.',
      '프리미엄': '프리미엄 다섯 칸에서 지칩니다. 세 칸으로 줄이고 나머지는 "더 보기"로 넘기는 안을 시험해 보세요.',
      '배치도': '배치도까지 보고 나갑니다. 호실을 고른 뒤 보이는 "이 호실 문의" 버튼이 잘 보이는지 확인하세요.',
      '입지': '입지 사진 네 장 뒤에서 나갑니다. 거리 숫자만 남기고 사진을 줄여 보세요.',
      '분양가': '분양가를 보고 나갑니다. 가격 근거와 "호실별 조건은 상담" 안내 바로 옆에 상담 버튼을 두세요.',
      '소식': '소식 구간에서 나갑니다. 소식을 상담 신청 아래로 내리는 안을 시험해 보세요.',
      '상담 신청': '상담 칸까지 와서 나갑니다. 입력 칸 수와 동의 문구 길이를 줄여 보세요.'
    };
    function diagnose(F, rows, srcs, us) {
      var out = [], worst = null;
      for (var i = 1; i < F.length; i++) { var drop = F[i - 1].n ? 1 - F[i].n / F[i - 1].n : 0; if (!worst || drop > worst.drop) worst = { i: i, drop: drop }; }
      if (worst && F[0].n) out.push({ k: '가장 많이 빠지는 단계', t: '"' + F[worst.i - 1].name + '" → "' + F[worst.i].name + '"에서 ' + P(worst.drop) + '가 빠집니다.', fix: STEP_FIX[worst.i] || '' });
      var ex = rows.slice(0, -1).reduce(function (a, b) { return b.exit > a.exit ? b : a; }, rows[0]);
      if (ex && ex.exitN) out.push({ k: '홈에서 가장 많이 나가는 구간', t: '"' + ex.name + '" 구간에서 홈 방문의 ' + P(ex.exit) + '가 사이트를 나갑니다.', fix: SEC_FIX[ex.name] || '' });
      var big = srcs.filter(function (r) { return r.n >= Math.max(20, F[0].n * 0.03); });
      if (big.length > 1) {
        var best = big.reduce(function (a, b) { return b.sub / b.n > a.sub / a.n ? b : a; }), bad = big.reduce(function (a, b) { return b.b / b.n > a.b / a.n ? b : a; });
        out.push({ k: '출처', t: jo(SRC[best.src] || best.src, '이', '가') + ' 상담 전환이 가장 높고(' + P(best.sub / best.n) + '), ' + jo(SRC[bad.src] || bad.src, '은', '는') + ' 첫 화면에서 나가는 비율이 가장 높습니다(' + P(bad.b / bad.n) + ').', fix: (SRC[bad.src] || bad.src) + ' 광고는 첫 화면이 아니라 배치도(#map)나 해당 호실 페이지로 바로 보내 보세요.' });
      }
      var open = Object.keys(us).map(function (k) { return us[k]; }).filter(function (u) { var s = K.stateOf(u.no); return s.lease === 'open' && u.n; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 3);
      if (open.length) out.push({ k: '모집 중인데 관심 많은 호실', t: open.map(function (u) { return u.no + '호(' + N(u.n) + '회)'; }).join(', ') + ' — 아직 임차인이 없는 호실 중 가장 많이 봤습니다.', fix: '이 호실들을 임차 상담 1순위로 두고, 호실 페이지에 맞는 업종 예시를 더 채워 주세요.' });
      return out;
    }

    // ── 그리기 ──
    function tipAttr(t) { return ' data-tip="' + esc(t) + '"'; }
    function view(v) {
      var ex = ui.data === 'all' ? genExample(ui.days) : [], re = real(ui.days);
      var list = sessionize(ex.concat(re));
      var realN = sessionize(re).length, F = funnel(list), rows = secRows(list), srcs = srcRows(list), us = unitStats(list), days = daily(list, ui.days);
      var tot = list.length || 1, bounce = list.filter(function (S) { return S.bounce; }).length, subs = list.filter(function (S) { return S.sub; }).length, calls = list.filter(function (S) { return S.call; }).length;
      var avg = list.reduce(function (s, S) { return s + S.dur; }, 0) / tot / 1000;
      var tag = ui.data === 'all' ? '<span class="ex-tag">예시 포함</span>' : '<span class="ex-tag real">실제 기록만</span>';
      var bar = '<div class="fn-bar"><div class="chips" data-days>' + [7, 14].map(function (d) { return '<button class="' + (ui.days === d ? 'on' : '') + '" data-d="' + d + '">최근 ' + d + '일</button>'; }).join('') + '</div>' +
        '<div class="chips" data-mode><button class="' + (ui.data === 'all' ? 'on' : '') + '" data-m="all">예시 + 실제 기록</button><button class="' + (ui.data === 'real' ? 'on' : '') + '" data-m="real">이 브라우저 실제 기록만</button></div>' +
        '<span class="fn-real">실제 기록 ' + N(realN) + '방문 <button class="link" data-clear>기록 지우기</button></span></div>';
      var notice = '<p class="fn-note">시안이라 홈페이지 방문 기록은 <b>방문한 그 브라우저</b>에만 남습니다. 숫자 대부분은 화면을 보여 드리려고 만든 <b>예시</b>입니다. 정식 오픈 때 GA4·그로스메이트 수집으로 바꾸면 모든 방문자가 집계됩니다. 이름·연락처는 기록하지 않습니다.</p>';
      var kpi = '<div class="fn-kpis">' + [
        ['방문', N(list.length), '최근 ' + ui.days + '일'],
        ['첫 화면에서 이탈', P(bounce / tot), '한 쪽만 보고 첫 화면에서 나간 방문'],
        ['평균 머문 시간', Math.floor(avg / 60) + '분 ' + Math.round(avg % 60) + '초', '방문 한 번 기준'],
        ['상담 신청', N(subs), '전환율 ' + P(subs / tot)],
        ['전화 누름', N(calls), '방문의 ' + P(calls / tot)]
      ].map(function (k) { return '<div class="fn-kpi"><span>' + k[0] + '</span><b>' + k[1] + '</b><small>' + k[2] + '</small></div>'; }).join('') + '</div>';
      // 퍼널
      var worstI = 1, worstD = -1;
      for (var i = 1; i < F.length; i++) { var dd = F[i - 1].n ? 1 - F[i].n / F[i - 1].n : 0; if (dd > worstD) { worstD = dd; worstI = i; } }
      var fun = '<div class="card"><h2>퍼널 ' + tag + '</h2><p class="d">방문한 사람이 상담 신청까지 몇 명 남는지 단계별로 봅니다. 앞 단계를 거친 방문만 다음 단계에 셉니다.</p><div class="fn-steps">' +
        F.map(function (s, i) {
          var w = F[0].n ? s.n / F[0].n : 0, drop = i && F[i - 1].n ? 1 - s.n / F[i - 1].n : 0;
          return (i ? '<div class="fn-drop' + (i === worstI ? ' worst' : '') + '">↓ ' + P(drop) + ' 빠짐' + (i === worstI ? ' · 가장 많이 빠지는 곳' : '') + '</div>' : '') +
            '<div class="fn-step"' + tipAttr(s.name + ' — ' + N(s.n) + '방문 (처음 방문의 ' + P(w) + ')') + '><span class="fn-sn">' + (i + 1) + '. ' + s.name + '</span><span class="fn-track"><i style="width:' + Math.max(0.6, w * 100).toFixed(1) + '%"></i></span><b>' + N(s.n) + '</b><small>' + P(w) + '</small></div>';
        }).join('') + '</div></div>';
      // 구간
      var maxExit = rows.slice(0, -1).reduce(function (a, b) { return b.exit > a.exit ? b : a; }, rows[0]);
      var sec = '<div class="card"><h2>홈페이지 구간별 도달·이탈 ' + tag + '</h2><p class="d">홈 첫 화면으로 들어온 방문이 어느 구간까지 내려 봤는지, 어느 구간을 마지막으로 사이트를 나갔는지 봅니다.</p>' +
        '<div class="legend"><span><i style="background:' + BLUE + '"></i>여기까지 본 비율</span><span><i style="background:' + ORANGE + '"></i>여기서 나간 비율</span></div><div class="fn-secs">' +
        rows.map(function (r) {
          var hot = r === maxExit && r.exitN;
          return '<div class="fn-sec' + (hot ? ' hot' : '') + '"' + tipAttr(r.name + ' — ' + N(r.reachN) + '방문이 여기까지 봄 (' + P(r.reach) + ') · ' + N(r.exitN) + '방문이 여기서 나감 (' + P(r.exit) + ')') + '><span class="fn-sn">' + r.name + (hot ? ' <em>가장 많이 나감</em>' : '') + '</span>' +
            '<span class="fn-track"><i style="width:' + (r.reach * 100).toFixed(1) + '%"></i></span><b>' + P(r.reach) + '</b>' +
            '<span class="fn-track ex"><i style="width:' + Math.min(100, r.exit * 100 * 4).toFixed(1) + '%"></i></span><small>' + P(r.exit) + '</small></div>';
        }).join('') + '</div><p class="d" style="margin:10px 0 0">나간 비율 막대는 잘 보이게 4배로 키웠습니다(숫자는 실제 값).</p></div>';
      // 출처
      var srcT = '<div class="card"><h2>들어온 곳별 성과 ' + tag + '</h2><p class="d">광고·문자·QR 링크에 utm 꼬리표를 붙이면 여기서 나뉘어 보입니다(예: ?utm_source=naver&utm_medium=cpc).</p><div class="tbl-wrap"><table class="fn-t"><thead><tr><th>들어온 곳</th><th>방문</th><th>첫 화면 이탈</th><th>호실 본 비율</th><th>상담 신청</th><th>전환율</th><th>전화</th></tr></thead><tbody>' +
        (function () {
          var big = srcs.filter(function (r) { return r.n >= 20; });
          var best = big.length ? big.reduce(function (a, b) { return b.sub / b.n > a.sub / a.n ? b : a; }) : null;
          var bad = big.length ? big.reduce(function (a, b) { return b.b / b.n > a.b / a.n ? b : a; }) : null;
          return srcs.map(function (r) {
            return '<tr><td><b>' + esc(SRC[r.src] || r.src) + '</b></td><td>' + N(r.n) + '</td><td>' + P(r.b / r.n) + (r === bad ? ' <span class="mk bad">이탈 최고</span>' : '') + '</td><td>' + P(r.u / r.n) + '</td><td>' + N(r.sub) + '</td><td><b>' + P(r.sub / r.n) + '</b>' + (r === best ? ' <span class="mk good">전환 최고</span>' : '') + '</td><td>' + N(r.call) + '</td></tr>';
          }).join('') || '<tr><td colspan="7" class="empty">기록이 없습니다</td></tr>';
        })() + '</tbody></table></div></div>';
      // 관심 호실
      var vals = Object.keys(us).map(function (k) { return us[k].n; }), mx = Math.max.apply(null, vals.concat([1]));
      function cell(no) {
        var u = us[no], lv = u.n ? Math.min(5, Math.floor(u.n / mx * 5.999)) : 0, st = stOf(no);
        return '<div class="hc" style="background:' + HEAT[lv] + ';color:' + (lv >= 3 ? '#fff' : '#161B35') + '"' + tipAttr(no + '호 · ' + st.c.label + (st.s.brand ? ' ' + st.s.brand : '') + ' — 관심 ' + N(u.n) + '회, 상담으로 이어짐 ' + N(u.sub) + '회') + '><b>' + no + '</b><small>' + N(u.n) + '</small></div>';
      }
      var dongs = [1, 2, 3].map(function (d) { return '<div class="hrow"><span>' + d + '동</span><div class="hcells">' + A.units.filter(function (u) { return u.dong === d; }).map(function (u) { return cell(u.no); }).join('') + '</div></div>'; }).join('');
      var top = Object.keys(us).map(function (k) { return us[k]; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
      var unitC = '<div class="card"><h2>관심 호실 ' + tag + '</h2><p class="d">배치도에서 0.7초 이상 올려 두거나 누른 호실, 호실 페이지를 연 횟수입니다. 진할수록 많이 봤습니다.</p>' +
        '<div class="heat">' + dongs + '<div class="hlegend"><span>적음</span>' + HEAT.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '<span>많음</span></div></div>' +
        '<div class="tbl-wrap"><table class="fn-t" style="margin-top:14px"><thead><tr><th>순위</th><th>호실</th><th>지금 상태</th><th>관심</th><th>상담으로 이어짐</th></tr></thead><tbody>' +
        top.map(function (u, i) { var st = stOf(u.no); return '<tr><td>' + (i + 1) + '</td><td><a class="link" href="../units/' + u.no + '/" target="_blank"><b>' + u.no + '호</b></a></td><td><span class="sw" style="background:' + st.c.color + '"></span>' + esc(st.c.label) + (st.s.brand ? ' · ' + esc(st.s.brand) : '') + '</td><td>' + N(u.n) + '</td><td>' + N(u.sub) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
      // 날짜별
      var dm = Math.max.apply(null, days.map(function (d) { return d.n; }).concat([1])), peak = days.reduce(function (a, b) { return b.n > a.n ? b : a; }, days[0]);
      var trend = '<div class="card"><h2>날짜별 방문 ' + tag + '</h2><p class="d">막대에 마우스를 올리면 그날 방문과 상담 신청 수가 보입니다.</p><div class="cols">' +
        days.map(function (d) { var h = d.n / dm * 100; return '<div class="col"' + tipAttr(md(d.t) + ' — 방문 ' + N(d.n) + ' · 상담 신청 ' + N(d.sub)) + '>' + (d === peak && d.n ? '<b>' + N(d.n) + '</b>' : '') + '<i style="height:' + Math.max(d.n ? 2 : 0, h).toFixed(1) + '%"></i><span>' + md(d.t) + '</span></div>'; }).join('') + '</div></div>';
      // 진단
      var dg = diagnose(F, rows, srcs, us);
      var diag = '<div class="card fn-diag"><h2>자동 진단 ' + tag + '</h2><p class="d">위 숫자에서 규칙으로 뽑은 문장입니다(AI 비용 없음). 고칠 곳은 관리자 "문구 수정"이나 요청으로 바로 반영합니다.</p><ol>' +
        dg.map(function (x) { return '<li><span class="k">' + esc(x.k) + '</span><p>' + esc(x.t) + '</p>' + (x.fix ? '<p class="fix">→ ' + esc(x.fix) + '</p>' : '') + '</li>'; }).join('') + '</ol></div>';
      v.innerHTML = bar + notice + kpi + diag + '<div class="fn-grid">' + fun + sec + '</div>' + unitC + '<div class="fn-grid">' + srcT + trend + '</div>';
      $$('[data-d]', v).forEach(function (b) { b.addEventListener('click', function () { ui.days = +b.dataset.d; saveUi(); view(v); }); });
      $$('[data-m]', v).forEach(function (b) { b.addEventListener('click', function () { ui.data = b.dataset.m; saveUi(); view(v); }); });
      $('[data-clear]', v).addEventListener('click', function () { if (confirm('이 브라우저에 남은 실제 방문 기록을 지울까요?')) { localStorage.removeItem(EV); view(v); } });
      bindTips(v);
    }
    // ── 마우스 올리면 뜨는 설명 ──
    var tipEl = null;
    function bindTips(root) {
      if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'fn-tip'; tipEl.hidden = true; document.body.appendChild(tipEl); }
      $$('[data-tip]', root).forEach(function (el) {
        el.addEventListener('mouseenter', function () { tipEl.textContent = el.dataset.tip; tipEl.hidden = false; });
        el.addEventListener('mousemove', function (e) { var w = tipEl.offsetWidth; tipEl.style.left = Math.min(innerWidth - w - 12, e.clientX + 14) + 'px'; tipEl.style.top = (e.clientY + 16) + 'px'; });
        el.addEventListener('mouseleave', function () { tipEl.hidden = true; });
      });
    }
    K.TITLES.funnel = '방문 분석';
    K.VIEWS.funnel = view;
    K.funnelApi = { genExample: genExample, sessionize: sessionize, funnel: funnel };
  });
})();
