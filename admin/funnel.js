/* 관리자 · 방문 분석 — 퍼널·구간 이탈·출처·관심 호실
   11-09 운영: 홈페이지 assets/track.js 가 운영 서버로 보낸 모든 방문자의 실제 기록만 씀(예시 생성기 삭제) */
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
    var ui = (function () { try { var u = Object.assign({ days: 14 }, JSON.parse(localStorage.getItem(UI)) || {}); delete u.data; return u; } catch (e) { return { days: 14 }; } })();
    try { localStorage.removeItem(EV); } catch (e) { /* 예전 시안 기록 정리 */ }
    function saveUi() { try { localStorage.setItem(UI, JSON.stringify(ui)); } catch (e) { /* 무시 */ } }
    function P(x) { var v = (x || 0) * 100; return (v > 0 && v < 10 ? v.toFixed(1) : String(Math.round(v))) + '%'; }
    function N(x) { return Number(x || 0).toLocaleString('ko-KR'); }
    function md(ms) { var d = new Date(ms + 9 * 3600e3); return (d.getUTCMonth() + 1) + '.' + d.getUTCDate(); }
    function ymd(ms) { return new Date(ms + 9 * 3600e3).toISOString().slice(0, 10); }
    function jo(w, a, b) { var c = String(w).charCodeAt(String(w).length - 1); return w + ((c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28) ? a : b); }
    function stOf(no) { var s = K.stateOf(no), c = K.colorOf(s); return { s: s, c: c }; }

    // ── 실제 기록 ──
    function real(list, days) {
      var since = Date.now() - days * 864e5;
      return (list || []).map(function (e) { return { t: +new Date(e.t), s: 'r_' + e.s, v: e.v, src: e.src, e: e.e, p: e.p, pv: e.pv, x: e.x || {} }; }).filter(function (e) { return e.t >= since && e.s !== 'r_undefined'; });
    }
    // ── 방문(세션)으로 묶기 ──
    function sessionize(events) {
      var by = {};
      events.forEach(function (e) { (by[e.s] = by[e.s] || []).push(e); });
      // 쪽 보기(pv)가 없는 방문(앞 쪽의 '나감'만 남은 조각)은 빼고 셈
      return Object.keys(by).filter(function (id) { return by[id].some(function (e) { return e.e === 'pv'; }); }).map(function (id) {
        var ev = by[id].sort(function (a, b) { return a.t - b.t; }), pvDur = {}, S = { id: id, ex: id.indexOf('ex') === 0, src: ev[0].src || 'direct', t: ev[0].t, land: (ev[0].x && ev[0].x.land) || ev[0].p, pv: 0, secs: {}, maxI: -1, units: [], call: 0, fs: 0, sub: 0, dur: 0, last: '', lastP: '' };
        ev.forEach(function (e) {
          if (e.e === 'pv') S.pv++;
          if (e.e === 'sec' && e.p === '/') { S.secs[e.x.n] = 1; var i = SECS.indexOf(e.x.n); if (i > S.maxI) S.maxI = i; }
          if (e.e === 'unit' && S.units.indexOf(e.x.no) < 0) S.units.push(e.x.no);
          if (e.e === 'call') S.call++;
          if (e.e === 'form_start') S.fs++;
          if (e.e === 'form_submit') S.sub++;
          if (e.e === 'leave') { var pk = e.pv || (e.p + e.t); pvDur[pk] = Math.max(pvDur[pk] || 0, e.x.dur || 0); S.last = e.x.last; S.lastP = e.p; }
          if (e.p === '/floorplan/') S.fp = 1;
        });
        S.dur = Object.keys(pvDur).reduce(function (a, k) { return a + pvDur[k]; }, 0);
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
    var cache = {};
    function view(v, force) {
      var R = window.ARTERA_REMOTE;
      if (!R || !R.on) { v.innerHTML = '<div class="card"><h2>방문 분석</h2><p class="d">운영 서버가 아직 연결되지 않았습니다. 연결되면 그때부터 모든 방문자의 기록이 쌓입니다.</p></div>'; return; }
      var c = cache[ui.days];
      if (c && !force && Date.now() - c.at < 120000) return draw(v, c.list);
      v.innerHTML = '<div class="card"><p class="d">방문 기록을 불러오는 중입니다…</p></div>';
      R.admin('events', { days: ui.days }, 60000).then(function (r) {
        if (!r || !r.ok) throw new Error('fail');
        cache[ui.days] = { at: Date.now(), list: r.events || [] };
        draw(v, r.events || []);
      }).catch(function (e) {
        if (String(e && e.message) === 'login') { location.reload(); return; }
        v.innerHTML = '<div class="card"><h2>방문 분석</h2><p class="d">방문 기록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p><button class="btn btn-line btn-sm" data-retry>다시 불러오기</button></div>';
        $('[data-retry]', v).addEventListener('click', function () { view(v, true); });
      });
    }
    function draw(v, raw) {
      var re = real(raw, ui.days);
      var list = sessionize(re);
      var realN = list.length, F = funnel(list), rows = secRows(list), srcs = srcRows(list), us = unitStats(list), days = daily(list, ui.days);
      var tot = list.length || 1, bounce = list.filter(function (S) { return S.bounce; }).length, subs = list.filter(function (S) { return S.sub; }).length, calls = list.filter(function (S) { return S.call; }).length;
      var avg = list.reduce(function (s, S) { return s + S.dur; }, 0) / tot / 1000;
      var tag = '<span class="ex-tag real">실제 기록</span>';
      var bar = '<div class="fn-bar"><div class="chips" data-days>' + [7, 14, 30].map(function (d) { return '<button class="' + (ui.days === d ? 'on' : '') + '" data-d="' + d + '">최근 ' + d + '일</button>'; }).join('') + '</div>' +
        '<span class="fn-real">방문 ' + N(realN) + '건 <button class="link" data-refresh>새로 고침</button></span></div>';
      var notice = '<p class="fn-note">홈페이지를 찾은 <b>모든 방문자</b>의 기록입니다(2026년 11월 운영 시작부터 집계). 이름·연락처는 기록하지 않습니다. 관리자 화면과 문구 수정 모드에서 본 것은 세지 않습니다.</p>';
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
      var gaCard = '<div class="card" data-ga><h2>방문자 특성 · 연령·성별·지역 <span class="ex-tag real">GA4</span></h2><p class="d">GA4에서 불러오는 중입니다…</p></div>';
      v.innerHTML = bar + notice + kpi + gaCard + diag + '<div class="fn-grid">' + fun + sec + '</div>' + unitC + '<div class="fn-grid">' + srcT + trend + '</div>';
      loadGa(v);
      $$('[data-d]', v).forEach(function (b) { b.addEventListener('click', function () { ui.days = +b.dataset.d; saveUi(); view(v); }); });
      $('[data-refresh]', v).addEventListener('click', function () { view(v, true); });
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
    // ── GA4 연령·성별·지역(사이트 운영 서버가 GA4 데이터 API 로 읽어 줌, 6시간 보관) ──
    var REGION = { Seoul: '서울', 'Gyeonggi-do': '경기', Incheon: '인천', Busan: '부산', Daegu: '대구', Daejeon: '대전', Gwangju: '광주', Ulsan: '울산', 'Sejong-si': '세종', 'Gangwon-do': '강원', 'Gangwon State': '강원', 'Chungcheongbuk-do': '충북', 'Chungcheongnam-do': '충남', 'Jeollabuk-do': '전북', 'Jeonbuk State': '전북', 'Jeollanam-do': '전남', 'Gyeongsangbuk-do': '경북', 'Gyeongsangnam-do': '경남', 'Jeju-do': '제주' };
    function ageLab(k) { return k === 'unknown' || k === '(not set)' ? '알 수 없음' : /\+$/.test(k) ? k.replace('+', '') + '세 이상' : k.replace('-', '~') + '세'; }
    function genLab(k) { return { male: '남성', female: '여성' }[k] || '알 수 없음'; }
    function regLab(k) { return k === '(not set)' ? '알 수 없음' : REGION[k] || k; }
    function gaList(title, rows, lab) {
      rows = (rows || []).slice(); var tot = rows.reduce(function (s, r) { return s + r.n; }, 0) || 1;
      var body = rows.slice(0, 8).map(function (r) {
        var w = r.n / tot * 100;
        return '<div style="display:grid;grid-template-columns:92px 1fr 64px;gap:8px;align-items:center;margin:7px 0"' + tipAttr(lab(r.k) + ' — ' + N(r.n) + '명 (' + P(r.n / tot) + ')') + '><span style="font-size:13px">' + esc(lab(r.k)) + '</span><span style="height:10px;background:#EEF1F8;border-radius:2px;overflow:hidden"><i style="display:block;height:100%;width:' + w.toFixed(1) + '%;background:' + BLUE + '"></i></span><b style="font-size:13px;text-align:right">' + P(r.n / tot) + '</b></div>';
      }).join('');
      return '<div><h3 style="font-size:14px;margin:0 0 6px">' + title + '</h3>' + (body || '<p class="d">아직 표시할 만큼 모이지 않았습니다.</p>') + '</div>';
    }
    function loadGa(v) {
      var box = $('[data-ga]', v), R = window.ARTERA_REMOTE; if (!box || !R) return;
      var days = ui.days === 7 ? 7 : ui.days === 14 ? 14 : 30, head = '<h2>방문자 특성 · 연령·성별·지역 <span class="ex-tag real">GA4 · 최근 ' + days + '일</span></h2>';
      R.admin('ga', { days: days }, 60000).then(function (r) {
        if (!r || !r.ok) {
          var why = { 'ga-not-set': 'GA4 연결 전입니다. 측정 ID와 속성 번호를 서버에 넣으면 여기에 나옵니다.', 'ga-key-missing': '서버에 GA 읽기 열쇠가 아직 없습니다.', 'ga-fail': 'GA에서 불러오지 못했습니다. 서버 계정의 GA 권한을 확인해 주세요.' }[r && r.err] || '불러오지 못했습니다.';
          box.innerHTML = head + '<p class="d">' + why + '</p>'; return;
        }
        box.innerHTML = head + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;margin-top:10px">' + gaList('연령대', r.age, ageLab) + gaList('성별', r.gender, genLab) + gaList('지역(시·도)', r.region, regLab) + '</div>' +
          '<p class="d" style="margin-top:10px">연령·성별은 GA4가 구글 신호로 추정한 값이라 일부 방문자만 잡히고, 방문자가 적으면 GA가 숨깁니다. 지역은 접속 위치 기준입니다. ' + (r.at ? '(' + new Date(r.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' 기준)' : '') + '</p>';
        bindTips(box);
      }).catch(function (e) { box.innerHTML = head + '<p class="d">' + (String(e && e.message) === 'login' ? '로그인이 끝났습니다. 다시 로그인해 주세요.' : '불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.') + '</p>'; });
    }
    K.TITLES.funnel = '방문 분석';
    K.VIEWS.funnel = view;
    K.funnelApi = { sessionize: sessionize, funnel: funnel };
  });
})();
