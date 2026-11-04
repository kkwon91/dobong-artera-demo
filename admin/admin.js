/* 도봉 아테라 상가 관리자 (시안: 브라우저 저장) */
(function () {
  'use strict';
  var A = window.ARTERA, KEY = 'artera.cms.v1', SESS = 'artera.admin.login';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var LEASE = A.lease, ZONES = A.zones, SALE = A.sale;

  // 광고 위험 표현 (공정위 부동산 심사지침 기준 실무 목록)
  var RISKY = [
    [/최저가|최저 분양가|가장 싸|가장 저렴/, '최상급 가격 표현', '"추정 건설원가 대비 ○% (114호 예시)"처럼 근거와 기준을 붙이세요'],
    [/최고|최대 규모|유일|독보적|압도적|1위|넘버원/, '근거 없는 최상급', '객관적 근거(출처·기준)를 함께 쓰거나 빼세요'],
    [/두\s?번\s?다시|마지막 기회|마지막 분양|곧 마감|완판 임박|선착순 마감/, '희소성 과장', '실제 잔여 호실·기한이 있을 때만, 사실 그대로'],
    [/보장|확정\s?수익|확정\s?수익률|무조건|100\s?%|원금 보장|평생 임대/, '수익·임대 보장', '수익률은 산출 방법과 함께 "예시·보장 아님"으로만'],
    [/입점\s?확정|출점\s?확정/, '입점 확정 표현', '임대차계약이 맺어진 경우에만. LOI는 "입점의향서 접수"로'],
    [/지금이 (가장|제일)|오를 수밖에|오른다|시세 차익|프리미엄 보장/, '가격 전망 단정', '미래 가격을 단정하지 마세요'],
    [/GTX|개통 예정|착공 확정/, '교통·개발 계획', '확정 여부·출처·시점을 함께 쓰세요("계획", "예정" 단서)'],
  ];
  function riskScan(text) {
    var hits = [];
    RISKY.forEach(function (r) { var m = String(text || '').match(r[0]); if (m) hits.push({ word: m[0], kind: r[1], fix: r[2] }); });
    return hits;
  }
  function riskBox(hits) {
    if (!hits.length) return '<div class="ok-box">광고 위험 표현 없음</div>';
    return '<div class="warn"><b>광고 위험 표현 ' + hits.length + '건</b> — 게시 전에 확인하세요<ul>' + hits.map(function (h) { return '<li>"' + esc(h.word) + '" · ' + h.kind + ' → ' + h.fix + '</li>'; }).join('') + '</ul></div>';
  }
  function logoUrl(brand) { var l = (A.brandLogos || {})[brand]; return l && !(db.logoOff || {})[brand] ? '../assets/img/brands/' + l.file : ''; }

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  var db = load();
  function save(msg) {
    localStorage.setItem(KEY, JSON.stringify(db));
    var s = $('#saved'); s.classList.add('show'); clearTimeout(save.t); save.t = setTimeout(function () { s.classList.remove('show'); }, 1600);
    if (msg) toast(msg);
    badges();
  }
  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 2200); }
  function log(text) { db.log = db.log || []; db.log.unshift({ at: new Date().toISOString(), text: text }); db.log = db.log.slice(0, 50); }
  function now() { var d = new Date(); return d.toLocaleDateString('ko-KR') + ' ' + d.toTimeString().slice(0, 5); }

  // 시안 예시 문의 (처음 한 번만)
  if (!db.seeded) {
    db.seeded = true;
    db.inquiries = (db.inquiries || []).concat([
      { id: 'ex1', at: '2026-11-04T01:12:00Z', kind: 'invest', name: '(예시) 김OO', phone: '010-0000-1111', area: '도봉구', unit: '115', budget: '3~5억', loan: '상담 후 결정', status: '신규', utm: { utm_source: 'richgo', utm_campaign: 'dobong_teaser' }, example: true },
      { id: 'ex2', at: '2026-11-04T00:40:00Z', kind: 'lease', name: '(예시) 박OO', phone: '010-0000-2222', area: '노원구', biz: '베이커리 카페', brand: '', size: '15~20평', status: '연락함', utm: { utm_source: 'meta', utm_campaign: 'kv_a' }, example: true },
      { id: 'ex3', at: '2026-11-03T07:05:00Z', kind: 'agent', name: '(예시) 이OO', phone: '010-0000-3333', office: '방학역 OO공인중개사', ceo: '이OO', addr: '도봉구 방학동', brief: '2026-11-12', status: '신규', utm: {}, example: true },
      { id: 'ex4', at: '2026-11-03T03:22:00Z', kind: 'invest', name: '(예시) 최OO', phone: '010-0000-4444', area: '강북구', unit: '', budget: '5~10억', loan: '활용 안 함', status: '완료', utm: { utm_source: 'naver' }, example: true },
    ]);
    log('시안 시작 — 호실 상태는 질문 답변(11월) 기준으로 채움');
    localStorage.setItem(KEY, JSON.stringify(db));
  }

  function stateOf(no) { return Object.assign({ sale: 'selling', lease: 'open', brand: '', note: '' }, A.stateSeed[no] || {}, (db.state || {})[no] || {}); }
  function colorOf(s) { if (s.sale === 'sold' && s.lease === 'open') return { color: '#9AA1B4', text: '#fff', label: '분양완료' }; var l = LEASE[s.lease]; return { color: l.color, text: l.text, label: l.label }; }
  function counts() {
    var c = { operating: 0, leased: 0, loi: 0, open: 0, soldOpen: 0, sold: 0 };
    A.units.forEach(function (u) { var s = stateOf(u.no); if (s.sale === 'sold') c.sold++; if (s.sale === 'sold' && s.lease === 'open') c.soldOpen++; else c[s.lease]++; });
    return c;
  }
  function news() { return db.news || JSON.parse(JSON.stringify(A.newsSeed)); }
  function popup() { return Object.assign({}, A.popupSeed, db.popup || {}); }
  function inquiries() { return (load().inquiries || []); }
  function badges() {
    var changed = Object.keys(db.state || {}).length;
    $('[data-badge=units]').textContent = changed ? changed + ' 변경' : '';
    var n = inquiries().filter(function (q) { return q.status === '신규'; }).length;
    $('[data-badge=inq]').textContent = n || '';
  }

  // ── 로그인
  function enter() { $('#login').hidden = true; $('#app').hidden = false; route(); badges(); }
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (this.id.value.trim() === 'artera' && this.pw.value === 'demo1234') { sessionStorage.setItem(SESS, '1'); enter(); }
    else $('#loginErr').textContent = '아이디 또는 비밀번호를 확인해 주세요.';
  });
  $('#logout').addEventListener('click', function () { sessionStorage.removeItem(SESS); location.reload(); });
  $('#reset').addEventListener('click', function () { if (confirm('시안 데이터(호실 변경·팝업·소식·문의)를 처음 상태로 되돌릴까요?')) { localStorage.removeItem(KEY); location.reload(); } });

  // ── 라우팅
  var TITLES = { dash: '대시보드', units: '호실 관리', popup: '팝업 관리', news: '소식 · 보도자료', inq: '문의 접수', aeo: 'AI 검색 점검', site: '사업 정보' };
  function route() {
    var r = (location.hash || '#dash').slice(1).split('/')[0]; if (!TITLES[r]) r = 'dash';
    $$('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.dataset.nav === r); });
    $('#pageTitle').textContent = TITLES[r];
    VIEWS[r]($('#view'));
    window.scrollTo(0, 0);
  }
  addEventListener('hashchange', route);

  function miniMap(sel) {
    return '<div class="mini"><svg viewBox="270 60 1930 520"><image href="../assets/img/siteplan-aerial.jpg" x="0" y="0" width="2400" height="632"/><rect width="2400" height="632" fill="rgba(18,22,48,.3)"/>' +
      A.units.map(function (u) {
        var c = colorOf(stateOf(u.no)), p = u.poly.split(' ').map(function (s) { return s.split(',').map(Number); });
        var cx = p.reduce(function (a, b) { return a + b[0]; }, 0) / p.length, cy = p.reduce(function (a, b) { return a + b[1]; }, 0) / p.length;
        return '<g class="u' + (sel === u.no ? ' on' : '') + '" data-no="' + u.no + '" style="--f:' + c.color + ';--t:' + (c.color === '#FFFFFF' ? '#1F2761' : '#fff') + '"><polygon points="' + u.poly + '"/><text x="' + cx.toFixed(0) + '" y="' + (cy + 6).toFixed(0) + '">' + u.no + '</text></g>';
      }).join('') + '</svg></div>' +
      '<div class="legend"><span><i style="background:' + LEASE.operating.color + '"></i>영업 중</span><span><i style="background:' + LEASE.leased.color + '"></i>임차 확정</span><span><i style="background:' + LEASE.loi.color + '"></i>LOI 접수</span><span><i style="background:#9AA1B4"></i>분양완료(공실)</span><span><i style="background:#fff"></i>모집 중</span></div>';
  }

  var VIEWS = {};
  // ── 대시보드
  VIEWS.dash = function (v) {
    var c = counts(), q = inquiries(), filled = c.operating + c.leased + c.loi;
    var lg = (db.log || []).slice(0, 8);
    v.innerHTML =
      '<div class="kpis">' + [['영업 중', c.operating, LEASE.operating.color], ['임차 확정', c.leased, LEASE.leased.color], ['LOI 접수', c.loi, LEASE.loi.color], ['분양완료', c.sold, '#9AA1B4'], ['임차인 모집 중', c.open + c.soldOpen, '#C9D0E4']].map(function (k) { return '<div class="kpi" style="--c:' + k[2] + '"><b>' + k[1] + '<small style="font-size:15px">실</small></b><span>' + k[0] + '</span></div>'; }).join('') + '</div>' +
      '<div class="grid2"><div class="card"><div class="row between"><div><h2>호실 현황 한눈에</h2><p class="d">임차 진행률 ' + Math.round(filled / 29 * 100) + '% (29실 중 ' + filled + '실 브랜드 확보). 호실을 누르면 바로 고칠 수 있습니다.</p></div><a class="btn btn-n btn-sm" href="#units">호실 관리 →</a></div>' +
      '<div class="bar-h" style="margin-bottom:14px"><i style="width:' + (c.operating / 29 * 100) + '%;background:' + LEASE.operating.color + '"></i><i style="width:' + (c.leased / 29 * 100) + '%;background:' + LEASE.leased.color + '"></i><i style="width:' + (c.loi / 29 * 100) + '%;background:' + LEASE.loi.color + '"></i><i style="width:' + (c.soldOpen / 29 * 100) + '%;background:#9AA1B4"></i></div>' + miniMap() + '</div>' +
      '<div style="display:grid;gap:18px;align-content:start"><div class="card"><div class="row between"><h2>새 문의</h2><a class="btn btn-line btn-sm" href="#inq">전체 →</a></div><p class="d">신규 ' + q.filter(function (x) { return x.status === '신규'; }).length + '건 · 전체 ' + q.length + '건</p>' +
      (q.slice(0, 4).map(function (x) { return '<div class="news-item" style="grid-template-columns:70px 1fr auto"><span class="pill" style="background:' + ({ invest: '#F15A24', lease: '#36A9E1', agent: '#1F2761' })[x.kind] + '">' + ({ invest: '투자', lease: '임차', agent: '중개사' })[x.kind] + '</span><div><b>' + esc(x.name) + '</b><small>' + esc(x.unit ? x.unit + '호 관심' : x.biz || x.office || x.area || '') + '</small></div><span class="st ' + stCls(x.status) + '">' + x.status + '</span></div>'; }).join('') || '<p class="empty">아직 문의가 없습니다.</p>') + '</div>' +
      '<div class="card"><h2>최근 변경</h2><ul class="log">' + (lg.map(function (l) { return '<li><small>' + new Date(l.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</small>' + esc(l.text) + '</li>'; }).join('') || '<li>변경 내역이 없습니다.</li>') + '</ul></div>' +
      '<div class="card"><h2>팝업</h2><p class="d">' + (popup().on ? '<span class="st st-on">켜짐</span> ' : '<span class="st st-off">꺼짐</span> ') + esc(popup().title) + '</p><a class="btn btn-line btn-sm" href="#popup">팝업 관리 →</a></div></div></div>';
    $$('.mini .u', v).forEach(function (g) { g.addEventListener('click', function () { location.hash = 'units/' + g.dataset.no; }); });
  };
  function stCls(s) { return s === '신규' ? 'st-new' : s === '연락함' ? 'st-call' : 'st-done'; }

  // ── 호실 관리
  VIEWS.units = function (v) {
    var sel = (location.hash.split('/')[1]) || '';
    v.innerHTML = '<div class="card"><div class="row between"><div><h2>배치도에서 호실 고르기</h2><p class="d">여기서 고친 상태가 홈페이지 메인 입점 보드 · LIVE 띠 · 배치도 · 면적표에 한 번에 반영됩니다.</p></div><a class="btn btn-line btn-sm" href="../floorplan/" target="_blank">홈페이지 배치도 ↗</a></div><div data-map>' + miniMap(sel) + '</div><div data-editor style="margin-top:16px"></div></div>' +
      '<div class="card"><div class="row between"><div><h2>29개 호실 상태표</h2><p class="d">바꾼 줄은 주황색으로 표시됩니다. 분양가·임대조건은 웹 비공개 원칙에 따라 여기서도 받지 않습니다.</p></div><div class="chips" data-f><button class="on" data-d="all">전체</button><button data-d="1">1동</button><button data-d="2">2동</button><button data-d="3">3동</button></div></div><div class="tbl-scroll"><table><thead><tr><th>호실</th><th>전용(평)</th><th>MD zone</th><th>분양</th><th>임차</th><th>브랜드</th><th>한 줄 설명 (방문자에게 보임)</th></tr></thead><tbody data-rows></tbody></table></div></div>';
    function rows(d) {
      $('[data-rows]', v).innerHTML = A.units.filter(function (u) { return d === 'all' || String(u.dong) === d; }).map(function (u) {
        var s = stateOf(u.no), ch = db.state && db.state[u.no];
        return '<tr data-no="' + u.no + '" class="' + (ch ? 'changed' : '') + '"><td><b>' + u.no + '호</b></td><td>' + u.exP.toFixed(2) + '</td><td>' + (u.zone ? ZONES[u.zone].label : '-') + '</td>' +
          '<td><select data-k="sale">' + Object.keys(SALE).map(function (k) { return '<option value="' + k + '"' + (s.sale === k ? ' selected' : '') + '>' + SALE[k] + '</option>'; }).join('') + '</select></td>' +
          '<td><select data-k="lease">' + Object.keys(LEASE).map(function (k) { return '<option value="' + k + '"' + (s.lease === k ? ' selected' : '') + '>' + LEASE[k].label + '</option>'; }).join('') + '</select></td>' +
          '<td><input data-k="brand" value="' + esc(s.brand) + '" placeholder="-"></td><td><input data-k="note" value="' + esc(s.note) + '" placeholder="예) 세탁 프랜차이즈 · 계약 진행 중"></td></tr>';
      }).join('');
      $$('[data-rows] [data-k]', v).forEach(function (el) { el.addEventListener('change', function () { var no2 = el.closest('tr').dataset.no, val = el.value; setTimeout(function () { setState(no2, el.dataset.k, val); }, 0); }); });
    }
    function editor(no) {
      var u = A.units.filter(function (x) { return x.no === no; })[0], box = $('[data-editor]', v);
      if (!u) { box.innerHTML = '<p class="d">↑ 배치도에서 호실을 누르면 여기서 바로 고칠 수 있습니다.</p>'; return; }
      var s = stateOf(no), c = colorOf(s);
      box.innerHTML = '<div class="editor"><div class="row between"><h3>' + (s.brand && logoUrl(s.brand) ? '<img class="ed-logo" src="' + logoUrl(s.brand) + '" alt="">' : '') + no + '호 <small style="font-size:14px;color:#5A6178">' + u.dong + '동 · 전용 ' + u.ex + '㎡(' + u.exP + '평) · 계약 ' + u.ct + '㎡(' + u.ctP + '평)' + (u.zone ? ' · ' + ZONES[u.zone].label : '') + '</small></h3><span class="pill" style="background:' + c.color + ';color:' + (c.color === '#FFFFFF' ? '#1F2761;border:1px solid #1F2761' : '#fff') + '">' + c.label + '</span></div>' +
        '<div class="fgrid"><label class="f">분양 상태<select data-e="sale">' + Object.keys(SALE).map(function (k) { return '<option value="' + k + '"' + (s.sale === k ? ' selected' : '') + '>' + SALE[k] + '</option>'; }).join('') + '</select></label>' +
        '<label class="f">임차 상태<select data-e="lease">' + Object.keys(LEASE).map(function (k) { return '<option value="' + k + '"' + (s.lease === k ? ' selected' : '') + '>' + LEASE[k].label + '</option>'; }).join('') + '</select></label>' +
        '<label class="f">입점(예정) 브랜드<input data-e="brand" value="' + esc(s.brand) + '" placeholder="예) 팜프라자"></label>' +
        '<label class="f">한 줄 설명<input data-e="note" value="' + esc(s.note) + '" placeholder="예) 창고형 약국 · 출점 확정"></label></div>' +
        '<div class="row" style="margin-top:12px"><button class="btn btn-o btn-sm" data-pop>이 소식으로 메인 팝업 띄우기</button><button class="btn btn-line btn-sm" data-newsdraft>소식 글 초안 만들기</button><span class="d" style="margin:0">값을 바꾸면 바로 저장됩니다.</span></div></div>';
      $$('[data-e]', box).forEach(function (el) { el.addEventListener('change', function () { var val = el.value; setTimeout(function () { setState(no, el.dataset.e, val); editor(no); }, 0); }); });
      $('[data-pop]', box).addEventListener('click', function () {
        var st = stateOf(no);
        db.popup = Object.assign(popup(), { on: true, title: (st.brand || no + '호') + ' ' + colorOf(st).label, body: no + '호 · ' + (st.note || '') , cta: '배치도에서 보기', link: 'floorplan/#u' + no });
        log('팝업 교체 — ' + db.popup.title); save('메인 팝업을 바꿨습니다'); location.hash = 'popup';
      });
      $('[data-newsdraft]', box).addEventListener('click', function () {
        var st = stateOf(no), list = news();
        var n = { id: 'n' + Date.now().toString(36), date: new Date().toISOString().slice(0, 10), type: '입점 소식', published: false, title: (st.brand || no + '호') + ' ' + colorOf(st).label + ' (' + no + '호)', summary: no + '호 ' + (st.note || ''), body: '', link: '' };
        list.unshift(n); db.news = list; log('소식 초안 — ' + n.title); save('소식 초안을 만들었습니다'); location.hash = 'news/' + n.id;
      });
    }
    function setState(no, k, val) {
      var before = stateOf(no);
      db.state = db.state || {}; db.state[no] = Object.assign({}, db.state[no] || {}, (function () { var o = {}; o[k] = val; return o; })());
      var label = k === 'lease' ? '임차 ' + LEASE[before.lease].label + ' → ' + LEASE[val].label : k === 'sale' ? '분양 ' + SALE[before.sale] + ' → ' + SALE[val] : (k === 'brand' ? '브랜드 ' : '설명 ') + '"' + val + '"';
      log(no + '호 ' + label); save(no + '호 저장됨');
      $('[data-map]', v).innerHTML = miniMap(no); bindMap(); rows(curD);
    }
    var curD = 'all';
    function bindMap() { $$('[data-map] .u', v).forEach(function (g) { g.addEventListener('click', function () { $$('[data-map] .u', v).forEach(function (x) { x.classList.toggle('on', x === g); }); editor(g.dataset.no); history.replaceState(null, '', '#units/' + g.dataset.no); }); }); }
    $$('[data-f] button', v).forEach(function (b) { b.addEventListener('click', function () { $$('[data-f] button', v).forEach(function (x) { x.classList.toggle('on', x === b); }); curD = b.dataset.d; rows(curD); }); });
    bindMap(); rows('all'); editor(sel);
  };

  // ── 팝업
  VIEWS.popup = function (v) {
    var p = popup();
    v.innerHTML = '<div class="grid2"><div class="card"><div class="row between"><div><h2>메인 팝업</h2><p class="d">출점 확정·브리핑 데이 같은 소식을 메인 첫 화면에 띄웁니다.</p></div><button class="switch' + (p.on ? ' on' : '') + '" data-sw aria-label="팝업 켜기"></button></div>' +
      '<div class="fgrid"><label class="f full">제목<input data-p="title" value="' + esc(p.title) + '"></label><label class="f full">내용<textarea data-p="body" rows="3">' + esc(p.body) + '</textarea></label>' +
      '<label class="f">버튼 글자<input data-p="cta" value="' + esc(p.cta) + '"></label><label class="f">연결 주소<select data-p="link">' + [['floorplan/', '배치도'], ['register/', '관심고객등록'], ['news/', '소식'], ['schedule/', '분양일정'], ['location/', '오시는 길']].concat(p.link && !/^(floorplan|register|news|schedule|location)\/$/.test(p.link) ? [[p.link, p.link]] : []).map(function (o) { return '<option value="' + o[0] + '"' + (p.link === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="f">시작일<input type="date" data-p="start" value="' + esc(p.start) + '"></label><label class="f">종료일<input type="date" data-p="end" value="' + esc(p.end) + '"></label></div>' +
      '<div class="row" style="margin-top:14px"><button class="btn btn-o" data-save>저장</button><a class="btn btn-line" href="../" target="_blank">홈페이지에서 확인 ↗</a></div><p class="d" style="margin-top:10px">※ 방문자가 "오늘 하루 보지 않기"를 누르면 그날은 다시 뜨지 않습니다.</p></div>' +
      '<div class="card"><h2>미리보기</h2><p class="d">실제 화면과 같은 모양입니다.</p><div class="prev"><div class="prev-img"><span>NEW</span></div><div class="prev-b"><h4 data-v="title"></h4><p data-v="body"></p><span class="btn btn-o btn-sm" data-v="cta"></span></div></div></div></div>';
    function pv() { ['title', 'body', 'cta'].forEach(function (k) { $('[data-v=' + k + ']', v).textContent = $('[data-p=' + k + ']', v).value + (k === 'cta' ? ' →' : ''); }); }
    $$('[data-p]', v).forEach(function (el) { el.addEventListener('input', pv); }); pv();
    $('[data-sw]', v).addEventListener('click', function () { this.classList.toggle('on'); });
    $('[data-save]', v).addEventListener('click', function () {
      var o = { on: $('[data-sw]', v).classList.contains('on') }; $$('[data-p]', v).forEach(function (el) { o[el.dataset.p] = el.value; });
      db.popup = o; log('팝업 ' + (o.on ? '켜기' : '끄기') + ' — ' + o.title); save('팝업 저장됨');
    });
  };

  // ── 소식
  VIEWS.news = function (v) {
    var list = news(), sel = location.hash.split('/')[1];
    var cur = list.filter(function (n) { return n.id === sel; })[0];
    v.innerHTML = '<div class="grid2"><div class="card"><div class="row between"><div><h2>글 목록</h2><p class="d">보도자료·에드버토리얼이 나올 때마다 여기에 붓습니다. 게시한 글만 홈페이지에 보입니다.</p></div><button class="btn btn-o btn-sm" data-new>+ 새 글</button></div>' +
      list.map(function (n) { return '<div class="news-item"><span class="pill" style="background:' + ({ '공지': '#1F2761', '입점 소식': '#F15A24', '보도자료': '#36A9E1', '데이터 인사이트': '#17A398' })[n.type] + '">' + n.type + '</span><a href="#news/' + n.id + '"><b>' + esc(n.title) + '</b><small>' + n.date + '</small></a><span class="st ' + (n.published ? 'st-on' : 'st-off') + '">' + (n.published ? '게시 중' : '보류') + '</span></div>'; }).join('') + '</div>' +
      '<div class="card" data-ed>' + (cur ? '' : '<p class="empty">왼쪽에서 글을 고르거나 새 글을 만드세요.<br><br>💡 데이터 인사이트: 반경 3km 상가 중개업소·MD 구성 분석 결과를 글로 올리면 입지환경의 근거로 쓰입니다.</p>') + '</div></div>';
    $('[data-new]', v).addEventListener('click', function () {
      var n = { id: 'n' + Date.now().toString(36), date: new Date().toISOString().slice(0, 10), type: '공지', published: false, title: '새 글', summary: '', body: '', link: '' };
      list.unshift(n); db.news = list; save(); location.hash = 'news/' + n.id;
    });
    if (!cur) return;
    var ed = $('[data-ed]', v);
    ed.innerHTML = '<h2>글 쓰기</h2><div class="fgrid" style="margin-top:12px"><label class="f">유형<select data-n="type">' + ['공지', '입점 소식', '보도자료', '데이터 인사이트'].map(function (t) { return '<option' + (cur.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></label><label class="f">날짜<input type="date" data-n="date" value="' + cur.date + '"></label>' +
      '<label class="f full">제목<input data-n="title" value="' + esc(cur.title) + '"></label><label class="f full">요약 (목록·검색 설명에 쓰임)<textarea data-n="summary" rows="2">' + esc(cur.summary) + '</textarea></label>' +
      '<label class="f full">본문<textarea data-n="body" rows="7">' + esc(cur.body) + '</textarea></label><label class="f full">원문 링크 (보도자료)<input data-n="link" value="' + esc(cur.link) + '" placeholder="https://"></label></div>' +
      '<div data-risk></div><div class="row" style="margin-top:14px"><button class="btn btn-o" data-pub>' + (cur.published ? '저장' : '게시하기') + '</button><button class="btn btn-line" data-hold>' + (cur.published ? '게시 내리기' : '보류로 저장') + '</button><button class="link" data-del>삭제</button></div>';
    function collect(pub) { $$('[data-n]', ed).forEach(function (el) { cur[el.dataset.n] = el.value; }); cur.published = pub; db.news = list; }
    function scan() { $('[data-risk]', ed).innerHTML = riskBox(riskScan(['title', 'summary', 'body'].map(function (k) { return $('[data-n=' + k + ']', ed).value; }).join(' '))); }
    $$('[data-n]', ed).forEach(function (el) { el.addEventListener('input', scan); }); scan();
    $('[data-pub]', ed).addEventListener('click', function () { var hits = riskScan(['title', 'summary', 'body'].map(function (k) { return $('[data-n=' + k + ']', ed).value; }).join(' ')); if (hits.length && !confirm('광고 위험 표현이 ' + hits.length + '건 있습니다. 그래도 게시할까요?')) return; collect(true); log('소식 게시 — ' + cur.title); save('게시했습니다'); VIEWS.news(v); });
    $('[data-hold]', ed).addEventListener('click', function () { collect(false); log('소식 보류 — ' + cur.title); save('보류로 저장했습니다'); VIEWS.news(v); });
    $('[data-del]', ed).addEventListener('click', function () { if (!confirm('이 글을 삭제할까요?')) return; db.news = list.filter(function (n) { return n !== cur; }); log('소식 삭제 — ' + cur.title); save('삭제했습니다'); location.hash = 'news'; });
  };

  // ── 문의 접수
  VIEWS.inq = function (v) {
    var kind = 'all';
    v.innerHTML = '<div class="card"><div class="row between"><div><h2>문의 접수</h2><p class="d">홈페이지 폼으로 들어온 문의입니다. 정식 오픈 때는 접수 즉시 영업팀 문자·메일로 알림이 갑니다. (예시) 표시는 시안용 가짜 데이터입니다.</p></div><div class="row"><div class="chips" data-k><button class="on" data-v="all">전체</button><button data-v="invest">투자</button><button data-v="lease">임차·창업</button><button data-v="agent">협력부동산</button></div><button class="btn btn-n btn-sm" data-csv>엑셀(CSV) 내려받기</button></div></div><div class="tbl-scroll"><table><thead><tr><th>접수</th><th>유형</th><th>이름</th><th>연락처</th><th>내용</th><th>유입</th><th>상태</th></tr></thead><tbody data-rows></tbody></table></div></div>';
    function rows() {
      var all = load().inquiries || [];
      var q = all.filter(function (x) { return kind === 'all' || x.kind === kind; });
      $('[data-rows]', v).innerHTML = q.map(function (x) {
        var detail = x.kind === 'invest' ? [x.unit ? x.unit + '호' : '', x.budget, x.loan].filter(Boolean).join(' · ') : x.kind === 'lease' ? [x.biz, x.brand, x.size].filter(Boolean).join(' · ') : [x.office, x.addr, x.brief ? '브리핑 ' + x.brief : ''].filter(Boolean).join(' · ');
        var u = x.utm || {};
        return '<tr data-id="' + x.id + '"><td>' + new Date(x.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</td><td><span class="pill" style="background:' + ({ invest: '#F15A24', lease: '#36A9E1', agent: '#1F2761' })[x.kind] + '">' + ({ invest: '투자', lease: '임차', agent: '중개사' })[x.kind] + '</span></td><td><b>' + esc(x.name) + '</b></td><td>' + esc(x.phone) + '</td><td>' + esc(detail || x.msg || '-') + '</td><td>' + esc(u.utm_source ? u.utm_source + (u.utm_campaign ? ' / ' + u.utm_campaign : '') : '직접 방문') + '</td><td><select data-st>' + ['신규', '연락함', '완료'].map(function (s) { return '<option' + (x.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td></tr>';
      }).join('') || '<tr><td colspan="7" class="empty">문의가 없습니다.</td></tr>';
      $$('[data-st]', v).forEach(function (s) { s.addEventListener('change', function () {
        var all2 = load(), id = s.closest('tr').dataset.id; all2.inquiries.forEach(function (x) { if (x.id === id) x.status = s.value; });
        db.inquiries = all2.inquiries; save('상태를 바꿨습니다');
      }); });
    }
    $$('[data-k] button', v).forEach(function (b) { b.addEventListener('click', function () { $$('[data-k] button', v).forEach(function (x) { x.classList.toggle('on', x === b); }); kind = b.dataset.v; rows(); }); });
    $('[data-csv]', v).addEventListener('click', function () {
      var all = load().inquiries || [], cols = ['at', 'kind', 'name', 'phone', 'area', 'unit', 'budget', 'loan', 'biz', 'brand', 'size', 'office', 'ceo', 'addr', 'brief', 'msg', 'status'];
      var csv = '﻿' + cols.join(',') + ',utm_source,utm_campaign\n' + all.map(function (x) { return cols.map(function (c) { return '"' + String(x[c] == null ? '' : x[c]).replace(/"/g, '""') + '"'; }).join(',') + ',"' + ((x.utm || {}).utm_source || '') + '","' + ((x.utm || {}).utm_campaign || '') + '"'; }).join('\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = '도봉아테라_문의_' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
    });
    rows();
  };

  // ── AEO 점검
  VIEWS.aeo = function (v) {
    var pages = [['메인', '', 'home'], ['사업개요', 'overview/', 'overview'], ['오시는 길', 'location/', 'location'], ['입지환경', 'environment/', 'environment'], ['프리미엄', 'premium/', 'premium'], ['배치도', 'floorplan/', 'floorplan'], ['분양일정', 'schedule/', 'schedule'], ['관심고객등록', 'register/', 'register']];
    var ld = { home: 'LocalBusiness · FAQPage', overview: 'FAQPage · BreadcrumbList', location: 'FAQPage · BreadcrumbList', environment: 'FAQPage · BreadcrumbList', premium: 'FAQPage · BreadcrumbList', floorplan: 'FAQPage · ItemList(29호실) · BreadcrumbList', schedule: 'FAQPage · BreadcrumbList', register: 'FAQPage · BreadcrumbList' };
    var total = Object.keys(A.faqCount).reduce(function (a, k) { return a + A.faqCount[k]; }, 0);
    v.innerHTML = '<div class="kpis" style="grid-template-columns:repeat(4,1fr)">' + [['FAQ 문답', total + '개', '#F15A24'], ['구조화 데이터 쪽', '8쪽', '#1F2761'], ['글자로 된 표', '면적표 29행 외', '#36A9E1'], ['검색 노출', '시안: 차단', '#9AA1B4']].map(function (k) { return '<div class="kpi" style="--c:' + k[2] + '"><b style="font-size:22px">' + k[1] + '</b><span>' + k[0] + '</span></div>'; }).join('') + '</div>' +
      '<div class="card"><h2>AI에게 이렇게 물으면, 이 페이지가 답합니다</h2><p class="d">미팅에서 요청한 질문("방학역 상권", "도봉역 상권", "상가 투자", "수익형 부동산")에 답하는 문장을 해당 페이지 FAQ·본문에 넣어 두었습니다.</p><table><thead><tr><th>예상 질문</th><th>답하는 페이지</th><th>근거 블록</th><th></th></tr></thead><tbody>' +
      A.aeoQueries.map(function (q) { return '<tr><td><b>' + esc(q[0]) + '</b></td><td>' + esc(q[1] === 'index' ? '메인' : q[1]) + '</td><td>' + esc(q[2]) + '</td><td><a class="btn btn-line btn-sm" target="_blank" href="../' + (q[1] === 'index' ? '' : q[1]) + '">열기 ↗</a></td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="card"><h2>페이지별 점검</h2><table><thead><tr><th>페이지</th><th>FAQ</th><th>구조화 데이터</th><th>표·숫자 글자화</th><th>설명문</th></tr></thead><tbody>' +
      pages.map(function (p) { return '<tr><td><b>' + p[0] + '</b></td><td class="ok">' + (A.faqCount[p[2]] || 0) + '개</td><td>' + ld[p[2]] + '</td><td class="ok">✓</td><td class="ok">✓</td></tr>'; }).join('') + '</tbody></table>' +
      '<p class="d" style="margin-top:12px"><a class="btn btn-n btn-sm" href="../compliance/" target="_blank">광고 컴플라이언스 점검 보고 ↗</a></p><p class="d" style="margin-top:12px">정식 오픈 체크: ① noindex·robots 차단 해제 ② 네이버 서치어드바이저·구글 서치콘솔 등록, sitemap.xml 제출 ③ GA4·메타 픽셀 연결(폼 전환 이벤트) ④ 보도자료 게재 때마다 소식 글 + NewsArticle 자동 생성</p></div>';
  };

  // ── 사업 정보
  VIEWS.site = function (v) {
    var owners = (db.site && db.site.owners) || A.site.owners;
    v.innerHTML = '<div class="card"><h2>바닥글 사업 주체</h2><p class="d">분양대행사 정식 명칭 등이 정해지면 여기서 고칩니다. 모든 페이지 바닥글에 반영됩니다.</p><div class="fgrid">' +
      owners.map(function (o, i) { return '<label class="f">' + esc(o[0]) + '<input data-i="' + i + '" value="' + esc(o[1]) + '"></label>'; }).join('') + '</div><div class="row" style="margin-top:14px"><button class="btn btn-o" data-save>저장</button></div></div>' +
      '<div class="card"><h2>브랜드 로고 표시</h2><p class="d">로고 사용 허락이 확인되지 않았거나 철회되면 끄세요. 끄면 홈페이지에 글자로 보입니다. 상표권은 각 사에 있습니다.</p><table><thead><tr><th>브랜드</th><th>로고</th><th>출처</th><th>사용 허락</th><th>표시</th></tr></thead><tbody>' +
      Object.keys(A.brandLogos || {}).map(function (b) { var l = A.brandLogos[b], on = !(db.logoOff || {})[b]; return '<tr><td><b>' + esc(b) + '</b></td><td class="logo-cell"><img src="../assets/img/brands/' + l.file + '" alt=""></td><td>' + esc(l.src) + '</td><td>' + (l.permit ? '<span class="st st-on">허락 받음</span>' : '<span class="st st-new">확인 필요</span>') + '</td><td><button class="switch' + (on ? ' on' : '') + '" data-logo="' + esc(b) + '" aria-label="' + esc(b) + ' 로고 표시"></button></td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="card"><h2>고정 정보</h2><table><tbody><tr><td>대표번호</td><td><b>' + A.site.phone + '</b></td></tr><tr><td>홍보관</td><td>' + esc(A.site.gallery) + ' · ' + A.site.galleryHours + '</td></tr><tr><td>전화 상담</td><td>' + A.site.callHours + '</td></tr><tr><td>주소</td><td>' + esc(A.site.address) + '</td></tr></tbody></table><p class="d" style="margin-top:10px">대표번호·운영시간은 바뀔 일이 드물어 코드로 관리합니다(요청 시 바로 수정).</p></div>';
    $$('[data-logo]', v).forEach(function (b) { b.addEventListener('click', function () { var k = b.dataset.logo; db.logoOff = db.logoOff || {}; if (db.logoOff[k]) delete db.logoOff[k]; else db.logoOff[k] = true; b.classList.toggle('on', !db.logoOff[k]); log(k + ' 로고 ' + (db.logoOff[k] ? '끄기' : '켜기')); save(k + ' 로고 ' + (db.logoOff[k] ? '숨김' : '표시')); }); });
    $('[data-save]', v).addEventListener('click', function () {
      var o = owners.map(function (x, i) { return [x[0], $('[data-i="' + i + '"]', v).value]; });
      db.site = { owners: o }; log('사업 정보 수정'); save('사업 정보 저장됨');
    });
  };
  // 이미 로그인한 탭이면 바로 들어감 (VIEWS 정의 뒤에 실행)
  if (sessionStorage.getItem(SESS) === '1') enter();
})();
