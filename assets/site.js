/* 도봉 아테라 단지 내 상가 — 인터랙션 */
(function () {
  'use strict';
  var A = window.ARTERA || {};
  var B = document.body.getAttribute('data-base') || '/';
  var KEY = 'artera.cms.v1';
  var EDITING = /[?&]edit=1/.test(location.search);
  var cms = {};
  try { cms = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { cms = {}; }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ── 호실 상태 (관리자 변경분 우선)
  function stateOf(no) {
    var base = { sale: 'selling', lease: 'open', brand: '', note: '' };
    var s = (A.stateSeed || {})[no] || {};
    var c = (cms.state || {})[no] || {};
    return Object.assign(base, s, c);
  }
  var UNITS = (A.units || []).map(function (u) { return Object.assign({}, u, { s: stateOf(u.no) }); });
  var byNo = {}; UNITS.forEach(function (u) { byNo[u.no] = u; });
  var LEASE = A.lease || {};
  var LOGOS = A.brandLogos || {};
  var logoOff = cms.logoOff || {};
  function logoOf(brand) { var l = LOGOS[brand]; return l && !logoOff[brand] ? B + 'assets/img/brands/' + l.file : ''; }
  var ZONES = A.zones || {};
  function leaseOf(u) { return LEASE[u.s.lease] || LEASE.open; }
  var AV = A.avail || { label: '영업 중 (분양 가능)', color: '#6B4FD8', text: '#fff' };
  var OS = A.opsold || { label: '영업 중 (분양 완료)', color: '#1E2A6E', text: '#fff' };
  var SO = A.soldopen || { label: '분양 완료', color: '#9AA1B4', text: '#fff' };
  var LOI_LONG = (LEASE.loi && LEASE.loi.long) || 'LOI 접수 완료 (입점의향서)';
  // 한 호실에 브랜드가 여럿이면 관리자에서 쉼표(,)·+ 로 나눠 적음 (예: 101호 팜프라자, 투썸플레이스)
  function brandsOf(u) { return String(u.s.brand || '').split(/\s*[,+\/·，]\s*/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function brandText(u) { return brandsOf(u).join(' · '); }
  function logosHtml(u) {
    var ls = brandsOf(u).map(function (b) { return [b, logoOf(b)]; }).filter(function (x) { return x[1]; });
    var im = ls.map(function (x) { return '<img class="pn-logo" src="' + x[1] + '" alt="' + esc(x[0]) + ' 로고">'; }).join('');
    return ls.length > 1 ? '<span class="pn-logos">' + im + '</span>' : im;
  }
  function isAvail(u) { return u.s.lease === 'operating' && u.s.sale !== 'sold'; } // 영업 중 (분양 가능)
  function isOpSold(u) { return u.s.lease === 'operating' && u.s.sale === 'sold'; } // 영업 중 (분양 완료)
  function displayLabel(u) {
    if (u.s.lease === 'operating') return isAvail(u) ? AV.label : OS.label;
    if (u.s.sale === 'sold' && u.s.lease === 'open') return SO.label;
    return leaseOf(u).label + (u.s.sale === 'available' ? ' · 분양 가능' : '');
  }
  function displayColor(u) {
    if (u.s.lease === 'operating') return isAvail(u) ? AV : OS;
    if (u.s.sale === 'sold' && u.s.lease === 'open') return SO;
    return leaseOf(u);
  }
  // 범례 — 김세연 님(11-06) 분류 순서. 0실이어도 분류는 늘 보여 줌
  function legendHtml(openStyle) {
    return [[OS.color, OS.label], [AV.color, AV.label], [LEASE.leased.color, LEASE.leased.label], [LEASE.loi.color, LOI_LONG], [SO.color, SO.label]]
      .map(function (k) { return '<span><i style="background:' + k[0] + '"></i>' + k[1] + '</span>'; }).join('') + '<span><i style="background:#fff' + openStyle + '"></i>모집 중</span>';
  }
  // 면적표 현황 칸: 상태 · 브랜드. 브랜드 이름 중간에서는 줄이 안 바뀌고, 칸 폭은 CSS 로 상한
  function cellStatusHtml(u) {
    var bs = brandsOf(u);
    return '<span class="cs"><b class="nb">' + esc(displayLabel(u)) + (bs.length ? ' ·' : '') + '</b>' + bs.map(function (b, i) { return ' <span class="nb">' + esc(b) + (i < bs.length - 1 ? ' ·' : '') + '</span>'; }).join('') + '</span>';
  }
  var IDX = {}; UNITS.forEach(function (u, i) { IDX[u.no] = i; });
  // 호실 묶어 쓰기: 같은 동에서 붙어 있으면(한 칸 건너뛴 것까지) 101~109호, 떨어져 있으면 101, 111~113호
  function rangeOf(nos) {
    var runs = [];
    nos.slice().sort(function (x, y) { return IDX[x] - IDX[y]; }).forEach(function (n) {
      var r = runs[runs.length - 1], p = r && r[r.length - 1];
      if (r && byNo[p].dong === byNo[n].dong && IDX[n] - IDX[p] <= 2) r.push(n); else runs.push([n]);
    });
    return runs.map(function (r) { return r.length > 2 ? r[0] + '~' + r[r.length - 1] : r.join('·'); }).join(', ') + '호';
  }
  function counts() {
    var c = { operating: 0, leased: 0, loi: 0, open: 0, sold: 0, soldOpen: 0, avail: 0, opSold: 0 }, deal = { operating: {}, leased: {}, loi: {} };
    UNITS.forEach(function (u) {
      if (isAvail(u)) c.avail++;
      if (isOpSold(u)) c.opSold++;
      if (u.s.sale === 'sold') c.sold++;
      if (u.s.sale === 'sold' && u.s.lease === 'open') c.soldOpen++;
      else { c[u.s.lease]++; if (deal[u.s.lease]) { var bs = brandsOf(u); (bs.length ? bs : ['#' + u.no]).forEach(function (b) { deal[u.s.lease][b] = 1; }); } }
    });
    // LOI 는 호실 수가 아니라 건수(브랜드별 1건) — 팜프라자 8개 호실 = 1건, 한 호실에 두 브랜드면 각각 1건
    c.loiDeals = Object.keys(deal.loi).length;
    return c;
  }
  var C = counts();

  // ── 헤더 · 스크롤
  var hd = $('#hd'), prog = $('.scroll-progress'), topBtn = $('.dock-top');
  function onScroll() {
    var y = window.scrollY;
    if (hd) hd.classList.toggle('solid', y > 40);
    var h = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    if (topBtn) topBtn.classList.toggle('show', y > 600);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (topBtn) topBtn.addEventListener('click', function () { scrollTo({ top: 0, behavior: 'smooth' }); });
  var burger = $('.burger'), mnav = $('#mnav');
  if (burger) burger.addEventListener('click', function () {
    var o = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', o); mnav.classList.toggle('open', o); mnav.setAttribute('aria-hidden', !o);
    document.body.style.overflow = o ? 'hidden' : '';
  });

  // ── LIVE 띠
  var live = $('[data-live-summary]');
  if (live) {
    live.innerHTML = [
      ['operating', '영업 중', C.operating, '실'], ['leased', LEASE.leased.label, C.leased, '실'], ['loi', LEASE.loi.label, C.loiDeals, '건'], ['open', '모집 중', C.open + C.soldOpen, '실']
    ].filter(function (x) { return x[2] > 0 || x[0] === 'open'; }).map(function (x) { var l = LEASE[x[0]]; return '<span class="chip"><i style="background:' + (x[0] === 'open' ? '#fff' : l.color) + '"></i>' + x[1] + ' <b><span data-count-to="' + x[2] + '">0</span>' + x[3] + '</b></span>'; }).join(' · ');
  }
  // 휴대폰은 LIVE 띠가 두 줄(11-06) — 실제 높이를 --live 로 넘겨 아래 내용이 가려지지 않게
  var liveBar = $('.live-bar');
  function fitLive() { if (!liveBar) return; var r = document.documentElement.style; r.removeProperty('--live'); r.setProperty('--live', liveBar.offsetHeight + 'px'); }
  fitLive(); addEventListener('resize', fitLive); addEventListener('load', fitLive);
  if (liveBar && 'ResizeObserver' in window) new ResizeObserver(function () { var h = liveBar.offsetHeight + 'px'; if (getComputedStyle(document.documentElement).getPropertyValue('--live').trim() !== h) fitLive(); }).observe(liveBar);

  // ── 사업 정보 (관리자에서 수정)
  if (cms.site && cms.site.owners) {
    var dl = $('[data-owners]');
    if (dl) dl.innerHTML = cms.site.owners.map(function (o) { return '<div><dt>' + esc(o[0]) + '</dt><dd>' + esc(o[1]) + '</dd></div>'; }).join('');
  }

  // ── 등장 · 숫자 올라가기
  var REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function countUp(el, again) {
    if (el.dataset.done && !again) return; el.dataset.done = 1;
    var to = parseFloat(el.getAttribute('data-count-to')), dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var show = function (v) { el.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('ko-KR'); };
    if (REDUCE) { show(to); return; }
    var t0 = performance.now() + parseInt(el.getAttribute('data-delay') || '0', 10), dur = parseInt(el.getAttribute('data-dur') || '1400', 10), tok = (el._tok || 0) + 1;
    el._tok = tok;
    function f(t) {
      if (el._tok !== tok) return;
      var p = Math.max(0, Math.min(1, (t - t0) / dur)), e = 1 - Math.pow(1 - p, 3);
      show(to * e);
      if (p < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }
  // 마우스를 올리면 숫자가 다시 0부터 (거리 상자·입점 숫자·LIVE 띠) — 같은 칸은 1.5초에 한 번
  function replayOnHover(sel) {
    $$(sel).forEach(function (box) {
      var last = 0;
      box.addEventListener('mouseenter', function () {
        var n = Date.now(); if (n - last < 1500) return; last = n;
        $$('[data-count-to]', box).forEach(function (el) { countUp(el, true); });
      });
    });
  }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      $$('[data-count-to]', e.target).forEach(countUp);
      if (e.target.hasAttribute('data-count-to')) countUp(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.18 }) : null;
  function watch(els) { els.forEach(function (el) { if (io) io.observe(el); else el.classList.add('in'); }); }
  watch($$('.reveal, .gantt, [data-bars], .fp, .drone-copy, .hero-copy, .phead-in, .dong-cards'));
  $$('.hero-slide.on [data-count-to]').forEach(countUp);
  $$('[data-live-summary] [data-count-to]').forEach(function (el) { countUp(el); });

  // ── 히어로 슬라이드 + 영상
  var hero = $('[data-hero]');
  if (hero) {
    var slides = $$('.hero-slide', hero), dots = $$('.hero-nav button', hero), cur = 0, timer;
    function go(i) {
      slides[cur].classList.remove('on'); dots[cur].classList.remove('on');
      cur = (i + slides.length) % slides.length;
      slides[cur].classList.add('on'); dots[cur].classList.remove('on'); void dots[cur].offsetWidth; dots[cur].classList.add('on');
      clearTimeout(timer); if (!EDITING) timer = setTimeout(function () { go(cur + 1); }, 9500);
      heroVid();
    }
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
    if (!EDITING) timer = setTimeout(function () { go(1); }, 9500);
  }
  // 영상 파일이 있을 때만 재생 (없으면 이미지 유지)
  // 휴대폰은 세로로 자른 가벼운 판(-m). 데이터 절약·2G/3G면 영상 없이 사진만. 첫 화면 영상은 페이지가 다 뜬 뒤 지금 보이는 장면만 받음
  var NET = navigator.connection || {}, SLOW = !!NET.saveData || /(^|-)(2g|3g)$/.test(NET.effectiveType || '');
  var pageLoaded = document.readyState === 'complete';
  function heroVid() { if (!pageLoaded) return; var on = $('.hero-slide.on video[data-video]'); if (on && on._load) on._load(); }
  function heroReady() { var hh = $('[data-hero]'); if (hh) hh.classList.add('loaded'); } // 2번 장면 사진은 다 뜬 뒤 받음(CSS)
  if (!pageLoaded) addEventListener('load', function () { pageLoaded = true; heroReady(); setTimeout(heroVid, 600); }); else heroReady();
  $$('video[data-video]').forEach(function (v) {
    if (SLOW || REDUCE) return;
    var src = (innerWidth < 900 && v.getAttribute('data-video-sm')) || v.getAttribute('data-video');
    v._load = function () { if (v._done) return; v._done = 1; load(); };
    if (v.closest('.hero-slide')) return;
    function load() {
      v.addEventListener('playing', function () { v.classList.add('ready'); }, { once: true });
      v.addEventListener('error', function () { v.remove(); }, { once: true });
      v.muted = true; v.preload = 'auto'; v.src = src; v.load();
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }
    if (io) { var vo = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { v._load(); vo.disconnect(); } }); vo.observe(v.parentNode); } else v._load();
  });
  if (pageLoaded) setTimeout(heroVid, 600);

  // ── 입점 현황 보드
  $$('[data-cells]').forEach(function (box) {
    var rows = [1, 2, 3].map(function (d) {
      return '<div class="cells-row"><span class="lbl">' + d + '동</span>' + UNITS.filter(function (u) { return u.dong === d; }).map(function (u, i) {
        var c = displayColor(u), open = u.s.lease === 'open' && u.s.sale !== 'sold';
        return '<button class="cell' + (open ? ' open' : '') + '" style="background:' + (open ? '' : c.color) + ';transition-delay:' + (i * 40) + 'ms;flex-grow:' + u.ex + '" data-cell="' + u.no + '" title="' + u.no + '호 · ' + displayLabel(u) + (brandText(u) ? ' · ' + esc(brandText(u)) : '') + '">' + u.no + '</button>';
      }).join('') + '</div>';
    }).join('');
    box.innerHTML = '<div><p class="eyebrow" style="margin:0">29개 호실 한눈에</p></div>' + rows +
      '<div class="cells-legend">' + legendHtml(';border:1.5px dashed #C9D0E4') + '</div>';
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cell]'); if (!b) return;
      var fp = $('[data-fp]');
      if (fp) { fp.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { selectUnit(fp, b.getAttribute('data-cell')); }, 500); }
      else location.href = B + 'floorplan/#u' + b.getAttribute('data-cell');
    });
  });
  $$('[data-stats]').forEach(function (box) {
    var names = function (f) { var o = []; UNITS.forEach(function (u) { if (f(u)) brandsOf(u).forEach(function (b) { if (o.indexOf(b) < 0) o.push(b); }); }); return esc(o.join(' · ')); };
    var nos = function (f) { return UNITS.filter(f).map(function (u) { return u.no; }); };
    var soldOpen = function (u) { return u.s.sale === 'sold' && u.s.lease === 'open'; };
    var rows = [];
    if (C.opSold) rows.push([OS.label, C.opSold, OS.color, names(isOpSold)]);
    if (C.avail) rows.push([AV.label, C.avail, AV.color, names(isAvail) + ' ' + rangeOf(nos(isAvail)) + ' · <span class="nw">영업 중인 채로 분양</span>']);
    if (C.leased) rows.push([LEASE.leased.label, C.leased, LEASE.leased.color, names(function (u) { return u.s.lease === 'leased'; })]);
    rows.push([LOI_LONG, C.loiDeals, LEASE.loi.color, C.loi + '개 호실 · <span class="nw">입점 확정 아님</span>', '건']);
    if (C.soldOpen) rows.push([SO.label, C.soldOpen, SO.color, nos(soldOpen).join(' · ') + '호 · <span class="nw">임차인 모집 중</span>']);
    box.innerHTML = rows.map(function (s) { return '<div class="stat" style="--c:' + s[2] + '"><b><span data-count-to="' + s[1] + '">' + s[1] + '</span><small>' + (s[4] || '실') + '</small></b><span><span>' + s[0].replace(/ \(([^)]+)\)$/, ' <span class="nw">($1)</span>') + '</span></span><small class="d">' + s[3] + '</small></div>'; }).join('');
    if (io) io.observe(box);
  });
  replayOnHover('[data-stats] .stat, .mini-dist > div, .dist-card, .live-bar');
  // 11-06 LIVE 띠 숫자 자동 반짝임: 영업 중 → LOI 접수 완료 → 모집 중 순서로 하나씩 다시 세며 강조(초록 점처럼 계속)
  (function () {
    var chips = $$('[data-live-summary] .chip'); if (!chips.length || REDUCE) return;
    chips.forEach(function (c) { var n = $('[data-count-to]', c); if (n) n.style.minWidth = String(n.getAttribute('data-count-to')).length + 'ch'; });
    var i = 0, hover = false;
    liveBar.addEventListener('mouseenter', function () { hover = true; });
    liveBar.addEventListener('mouseleave', function () { hover = false; });
    function step() {
      if (!document.hidden && !hover) {
        var c = chips[i % chips.length], n = $('[data-count-to]', c); i++;
        chips.forEach(function (x) { x.classList.toggle('glow', false); }); void c.offsetWidth; c.classList.toggle('glow', true);
        if (n) { n.setAttribute('data-dur', '900'); countUp(n, true); }
      }
      setTimeout(step, 2600);
    }
    setTimeout(step, 2600);
  })();
  $$('[data-brands]').forEach(function (box) {
    var seen = {}, list = [];
    UNITS.forEach(function (u) {
      if (u.s.lease === 'open') return;
      brandsOf(u).forEach(function (b) {
        if (!seen[b]) { seen[b] = { brand: b, units: [], lease: u.s.lease, note: u.s.note, c: displayColor(u), label: displayLabel(u) }; list.push(seen[b]); }
        seen[b].units.push(u.no);
      });
    });
    var order = { operating: 0, leased: 1, loi: 2 };
    list.sort(function (a, b) { return order[a.lease] - order[b.lease]; });
    box.innerHTML = list.map(function (x) {
      var lg = logoOf(x.brand);
      return '<div class="brand"><span class="bs" style="background:' + x.c.color + '">' + esc(x.label) + '</span><div class="blogo">' + (lg ? '<img src="' + lg + '" alt="' + esc(x.brand) + ' 로고" loading="lazy">' : '<b class="bn">' + esc(x.brand) + '</b>') + '</div><b class="bn2">' + esc(x.brand) + '</b><span class="bu">' + rangeOf(x.units) + ' · ' + esc((x.note || '').split('·')[0]) + '</span></div>';
    }).join('');
  });

  // ── 인터랙티브 배치도
  var tip = null;
  function paint(fp) {
    var mode = fp.dataset.mode || 'lease', dong = fp.dataset.dong || 'all';
    $$('.u', fp).forEach(function (g) {
      var u = byNo[g.getAttribute('data-no')];
      var c = mode === 'zone' ? (u.zone ? { color: ZONES[u.zone].color, text: '#fff' } : { color: '#C9CDD8', text: '#1F2761' }) : displayColor(u);
      g.style.setProperty('--f', c.color); g.style.setProperty('--t', c.text);
      g.classList.toggle('dim', dong !== 'all' && String(u.dong) !== dong);
    });
    var lg = $('[data-legend]', fp);
    if (lg) lg.innerHTML = mode === 'zone'
      ? Object.keys(ZONES).map(function (k) { return '<span><i style="background:' + ZONES[k].color + '"></i>' + ZONES[k].label.replace(' zone', '') + '</span>'; }).join('')
      : legendHtml('');
    var ct = $('[data-count]', fp);
    if (ct) {
      ct.innerHTML = [[OS.label, C.opSold, OS.color], [AV.label, C.avail, AV.color], [LEASE.leased.label, C.leased, LEASE.leased.color], [LEASE.loi.label, C.loiDeals, LEASE.loi.color, '건', C.loi + '개 호실'], [SO.label, C.soldOpen, SO.color], ['임차인 모집 중', C.open, '#fff']]
        .filter(function (r) { return r[1] > 0 || r[0] === '임차인 모집 중'; })
        .map(function (r) { return '<div' + (r[4] ? ' title="' + r[4] + '"' : '') + '><span><i style="background:' + r[2] + '"></i>' + r[0] + (r[4] ? ' <small>' + r[4] + '</small>' : '') + '</span><b><span data-count-to="' + r[1] + '">0</span>' + (r[3] || '실') + '</b></div>'; }).join('');
      if (fp.classList.contains('in')) $$('[data-count-to]', ct).forEach(function (el) { countUp(el, true); });
    }
  }
  function panelHtml(u) {
    var c = displayColor(u), z = u.zone ? ZONES[u.zone] : null;
    return '<div class="pn"><button class="pn-close" aria-label="닫기">✕</button>' +
      '<div class="pn-top"><span class="pn-no">' + u.no + '<small>호 · ' + u.dong + '동</small></span><span class="pn-st" style="background:' + c.color + ';color:' + c.text + (c.color === '#FFFFFF' ? ';border:1.5px solid #1F2761' : '') + '">' + displayLabel(u) + '</span></div>' +
      (brandText(u) ? '<div class="pn-brand">' + logosHtml(u) + '<b>' + esc(brandText(u)) + '</b><span>' + esc(u.s.note) + '</span>' + (u.s.lease === 'loi' ? '<em class="pn-loi">LOI는 입점 확정이 아닌 협의 단계입니다</em>' : '') + (isAvail(u) ? '<em class="pn-avail">매장이 영업 중인 채로 분양하는 호실입니다</em>' : '') + '</div>' : '<div class="pn-brand"><b>' + (u.s.sale === 'sold' ? '분양 완료 호실' : '입점 브랜드 모집 중') + '</b><span>' + esc(u.s.note || (z ? z.md + ' 업종 추천' : '업종 제한 없이 상담')) + '</span></div>') +
      '<dl class="pn-dl"><div><dt>전용면적</dt><dd>' + u.ex.toFixed(2) + '㎡ <small>' + u.exP.toFixed(2) + '평</small></dd></div><div><dt>계약면적</dt><dd>' + u.ct.toFixed(2) + '㎡ <small>' + u.ctP.toFixed(2) + '평</small></dd></div>' +
      '<div><dt>분양</dt><dd>' + (A.sale[u.s.sale] || '분양 예정') + '</dd></div><div><dt>임차</dt><dd>' + leaseOf(u).label + '</dd></div></dl>' +
      (z ? '<p class="pn-zone"><i style="background:' + z.color + '"></i><span><b>' + z.label + '</b>' + (brandText(u) || u.s.note ? '<br>' + esc(z.md) : '') + '</span></p>' : '') +
      '<div class="pn-btns"><a class="btn btn-navy" href="' + B + 'units/' + u.no + '/">' + u.no + '호 자세히 보기</a>' + (u.s.sale !== 'sold' ? '<a class="btn btn-orange" href="' + B + 'register/?kind=invest&unit=' + u.no + '#invest">이 호실 투자 문의</a>' : '') +
      (u.s.lease === 'open' || u.s.lease === 'loi' ? '<a class="btn btn-line" href="' + B + 'register/?kind=lease&unit=' + u.no + '#lease">이 호실 임차 문의</a>' : '') + '</div></div>';
  }
  var FP_EMPTY = '<div class="fp-empty"><p class="eyebrow">29개 호실</p><h3>배치도에서 호실을<br>눌러 보세요</h3><p class="fp-how">면적 · 입점 브랜드 · 분양·임차 상태 · 문의 버튼이 여기에 나타납니다</p><div class="fp-try"><span>예시로 보기</span><button type="button" data-try="114">114호</button><button type="button" data-try="111">111호</button><button type="button" data-try="204">204호</button></div><div class="fp-count" data-count></div></div>';
  function selectUnit(fp, no, quiet) {
    var u = byNo[no]; if (!u) return;
    $$('.u', fp).forEach(function (g) { g.classList.toggle('on', g.getAttribute('data-no') === no); });
    var p = $('[data-panel]', fp); p.innerHTML = panelHtml(u);
    var cl = $('.pn-close', p); if (cl) cl.addEventListener('click', function () { $$('.u', fp).forEach(function (g) { g.classList.remove('on'); }); p.innerHTML = FP_EMPTY; paint(fp); });
    if (quiet) return;
    var h = $('.fp-hint', fp); if (h) h.classList.add('hide');
    if (innerWidth < 1180) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function showTip(e, u) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'fp-tip'; document.body.appendChild(tip); }
    var c = displayColor(u);
    tip.innerHTML = '<b>' + u.no + '호</b><span class="t-st" style="background:' + c.color + ';color:' + c.text + (c.color === '#FFFFFF' ? ';border:1px solid #1F2761' : '') + '">' + displayLabel(u) + '</span>' +
      (brandText(u) ? '<span class="t-br">' + esc(brandText(u)) + '</span>' : '') +
      '<span class="t-m">전용 ' + u.exP.toFixed(2) + '평 · 계약 ' + u.ctP.toFixed(2) + '평</span>' +
      (u.zone ? '<span class="t-m">' + ZONES[u.zone].label + '</span>' : '');
    tip.hidden = false;
    // 화면 밖으로 안 나가게: 좌우는 화면 안에, 아래가 모자라면(휴대폰 하단 버튼 줄) 호실 위로
    var x = e.clientX, y = e.clientY, w = Math.max(tip.offsetWidth, 200), th = tip.offsetHeight;
    var left = x + w + 30 > innerWidth ? x - w - 30 : x;
    left = Math.max(-8, Math.min(left, innerWidth - w - 24));
    tip.style.left = left + 'px';
    tip.style.top = (y + th + 40 > innerHeight - 70 ? y - th - 40 : y) + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }
  $$('[data-fp]').forEach(function (fp) {
    fp.dataset.mode = 'lease'; fp.dataset.dong = 'all';
    // 배치도 바탕 항공사진(230KB)은 배치도가 가까워지면 받음
    var fimg = $('.fp-img', fp);
    if (fimg && fimg.getAttribute('data-href')) {
      var setImg = function () { fimg.setAttribute('href', fimg.getAttribute('data-href')); fimg.removeAttribute('data-href'); };
      if ('IntersectionObserver' in window) { var lo = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { lo.disconnect(); setImg(); } }, { rootMargin: '900px 0px' }); lo.observe(fp); } else setImg();
    }
    paint(fp);
    $$('[data-mode]', fp).forEach(function (b) { b.addEventListener('click', function () { $$('[data-mode]', fp).forEach(function (x) { x.classList.toggle('on', x === b); }); fp.dataset.mode = b.dataset.mode; paint(fp); }); });
    $$('[data-dong]', fp).forEach(function (b) { b.addEventListener('click', function () { $$('[data-dong]', fp).forEach(function (x) { x.classList.toggle('on', x === b); }); fp.dataset.dong = b.dataset.dong; paint(fp); goDong(b.dataset.dong); }); });
    var hover = matchMedia('(hover:hover)').matches;
    $$('.u', fp).forEach(function (g) {
      var no = g.getAttribute('data-no'), u = byNo[no];
      if (hover) {
        g.addEventListener('mouseenter', function (e) { showTip(e, u); selectUnit(fp, no); });
        g.addEventListener('mousemove', function (e) { showTip(e, u); });
        g.addEventListener('mouseleave', hideTip);
      }
      g.addEventListener('click', function () { selectUnit(fp, no); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectUnit(fp, no); } });
    });
    var m = location.hash.match(/^#u(\d{3})$/); if (m) setTimeout(function () { fp.scrollIntoView({ block: 'center' }); selectUnit(fp, m[1]); }, 300);
    if (fp.dataset.select) selectUnit(fp, fp.dataset.select);

    // ── 처음 보는 사람에게 '누르면 정보가 나온다'를 직접 보여 주기 — 한 번만, 손대면 바로 멈춤
    // (자동 안내는 진짜 마우스·누름이 아니라 방문 기록(track.js)에 관심 호실로 잡히지 않음)
    var stage = $('[data-stage]', fp), touched = false, timers = [], tap = null;
    function later(fn, ms) { timers.push(setTimeout(function () { if (!touched) fn(); }, ms)); }
    function stopDemo() {
      if (touched) return; touched = true;
      timers.forEach(clearTimeout); timers = [];
      if (tap) tap.classList.remove('show');
      if (fp.classList.contains('demo')) { fp.classList.remove('demo'); hideTip(); }
    }
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { fp.addEventListener(ev, stopDemo, { passive: true }); });
    $$('.u', fp).forEach(function (g) { g.addEventListener('mouseenter', stopDemo); });
    addEventListener('scroll', function () { if (fp.classList.contains('demo')) hideTip(); }, { passive: true });
    fp.addEventListener('click', function (e) { var t = e.target.closest('[data-try]'); if (t) { stopDemo(); selectUnit(fp, t.getAttribute('data-try')); } });
    var hintEl = $('.fp-hint', fp);
    function center(g) { var r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    function moveTap(g) {
      var c = center(g), sr = stage.getBoundingClientRect();
      tap.style.translate = (c.x - sr.left + stage.scrollLeft) + 'px ' + (c.y - sr.top + stage.scrollTop) + 'px';
    }
    function step(no, at) {
      var g = $('.u[data-no="' + no + '"]', fp); if (!g) return;
      later(function () { // 옆으로 넘치는 휴대폰 화면이면 그 호실이 보이게 밀기
        var c = center(g), sr = stage.getBoundingClientRect();
        if (c.x < sr.left + 50 || c.x > sr.right - 50) stage.scrollBy({ left: c.x - (sr.left + sr.width / 2), behavior: 'smooth' });
      }, at);
      later(function () { moveTap(g); tap.classList.add('show'); }, at + 380);
      later(function () {
        moveTap(g); tap.classList.remove('press'); void tap.offsetWidth; tap.classList.add('press');
        var c = center(g); showTip({ clientX: c.x, clientY: c.y }, byNo[no]); selectUnit(fp, no, true);
      }, at + 1100);
    }
    function runDemo() {
      if (touched || REDUCE || fp.dataset.select || m) return;
      if (!tap) {
        tap = document.createElement('div'); tap.className = 'fp-tap'; tap.setAttribute('aria-hidden', 'true');
        tap.style.translate = (stage.scrollLeft + stage.clientWidth / 2) + 'px ' + stage.clientHeight / 2 + 'px';
        stage.appendChild(tap);
      }
      fp.classList.add('demo');
      var seq = ['114', '111', '204'].filter(function (n) { return byNo[n]; });
      seq.forEach(function (no, i) { step(no, 300 + i * 3000); });
      later(function () { hideTip(); tap.classList.remove('show'); fp.classList.remove('demo'); }, 300 + seq.length * 3000);
    }
    if (stage && 'IntersectionObserver' in window) {
      var dio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { dio.disconnect(); runDemo(); } }, { threshold: 0.6 });
      dio.observe(stage);
    }

    // ── 확대·축소(+ − 전체 단추, 두 손가락, 노트북 터치패드) · 동 단추 누르면 그 동으로 이동 (11-05 김세연 님 요청)
    var svg = $('.fp-svg', fp), zb = $('[data-zoom-box]', fp), H0 = 0;
    function svgW() { return svg.getBoundingClientRect().width; }
    function fitW() { return stage.clientWidth; }
    function maxW() { return Math.max(fitW() * 3, 2000); }
    function zoomBtns() {
      if (!zb || !stage) return;
      var w = svgW();
      $('[data-zoom="in"]', zb).disabled = w >= maxW() - 1;
      $('[data-zoom="out"]', zb).disabled = $('[data-zoom="fit"]', zb).disabled = w <= fitW() + 1;
    }
    function setW(w, cx, cy) { // cx·cy: 화면 좌표의 기준점(그 자리가 그대로 있게 확대)
      if (!stage || !svg) return;
      if (!H0) H0 = stage.offsetHeight;
      var sr = stage.getBoundingClientRect(), r0 = svg.getBoundingClientRect();
      w = Math.max(fitW(), Math.min(maxW(), w));
      var fx = cx == null ? sr.width / 2 : cx - sr.left, fy = cy == null ? sr.height / 2 : cy - sr.top;
      var px = (stage.scrollLeft + fx) / r0.width, py = (stage.scrollTop + fy) / r0.height, h = w * r0.height / r0.width;
      svg.style.minWidth = '0'; svg.style.width = w + 'px';
      stage.style.height = Math.round(Math.min(H0, h + stage.offsetHeight - stage.clientHeight)) + 'px';
      stage.scrollLeft = px * w - fx; stage.scrollTop = py * h - fy;
      fp.classList.add('zoomed'); zoomBtns();
    }
    if (zb) zb.addEventListener('click', function (e) {
      var b = e.target.closest('[data-zoom]'); if (!b || b.disabled) return;
      var k = b.getAttribute('data-zoom');
      setW(k === 'fit' ? 0 : svgW() * (k === 'in' ? 1.5 : 1 / 1.5));
    });
    if (stage && svg) {
      var pin = null;
      var tdist = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); };
      stage.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pin = { d: tdist(e.touches), w: svgW() }; }, { passive: true });
      stage.addEventListener('touchmove', function (e) {
        if (!pin || e.touches.length !== 2) return;
        e.preventDefault();
        var t = e.touches; setW(pin.w * tdist(t) / pin.d, (t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2);
      }, { passive: false });
      stage.addEventListener('touchend', function (e) { if (e.touches.length < 2) pin = null; }, { passive: true });
      stage.addEventListener('wheel', function (e) { if (!e.ctrlKey) return; e.preventDefault(); setW(svgW() * Math.exp(-e.deltaY / 300), e.clientX, e.clientY); }, { passive: false });
      // 가로 폭이 바뀔 때만 확대를 처음으로 — 휴대폰은 스크롤하면 주소창이 숨으며 높이만 바뀌는데, 그때 풀리면 안 됨
      var lastVW = innerWidth;
      addEventListener('resize', function () { if (innerWidth === lastVW) return; lastVW = innerWidth; if (fp.classList.contains('zoomed')) { svg.style.width = svg.style.minWidth = stage.style.height = ''; H0 = 0; fp.classList.remove('zoomed'); } zoomBtns(); });
      zoomBtns();
    }
    function goDong(d) {
      if (!stage || d === 'all' || stage.scrollWidth <= stage.clientWidth + 2) return;
      var sr = stage.getBoundingClientRect(), l = 1e9, r = -1e9, t = 1e9, bt = -1e9;
      $$('.u', fp).forEach(function (g) {
        if (String(byNo[g.getAttribute('data-no')].dong) !== d) return;
        var q = g.getBoundingClientRect(); l = Math.min(l, q.left); r = Math.max(r, q.right); t = Math.min(t, q.top); bt = Math.max(bt, q.bottom);
      });
      if (l > r) return;
      var x = r - l > sr.width - 40 ? l - sr.left - 20 : (l + r) / 2 - (sr.left + sr.width / 2);
      var y = bt - t > sr.height - 40 ? t - sr.top - 20 : (t + bt) / 2 - (sr.top + sr.height / 2);
      stage.scrollBy({ left: x, top: y, behavior: REDUCE ? 'auto' : 'smooth' });
    }
  });

  // 면적표 현황 칸 갱신 + 동 필터
  $$('[data-unit-status]').forEach(function (td) { var u = byNo[td.getAttribute('data-unit-status')]; if (!u) return; td.textContent = displayLabel(u) + (brandText(u) ? ' · ' + brandText(u) + (u.s.lease === 'loi' ? ' (입점의향서 접수 — 입점 확정 아님)' : '') : ''); });
  $$('[data-row]').forEach(function (tr) {
    var u = byNo[tr.getAttribute('data-row')]; if (!u) return;
    var td = $('[data-cell-status]', tr);
    if (td) td.innerHTML = cellStatusHtml(u);
    tr.classList.toggle('sold', u.s.sale === 'sold');
  });
  $$('[data-tbl-filter]').forEach(function (bar) {
    var tbl = bar.nextElementSibling && $('table', bar.nextElementSibling);
    $$('button', bar).forEach(function (b) { b.addEventListener('click', function () {
      $$('button', bar).forEach(function (x) { x.classList.toggle('on', x === b); });
      $$('tbody tr', tbl).forEach(function (tr) { tr.hidden = b.dataset.dong !== 'all' && tr.dataset.dong !== b.dataset.dong; });
      // 11-06 합계 줄도 고른 동 합계로
      var foot = $('tfoot', tbl), sums = null;
      try { sums = JSON.parse(foot.getAttribute('data-sums')); } catch (e) {}
      var v = sums && sums[b.dataset.dong];
      if (v) { var cells = $$('tr > *', foot); for (var k = 0; k < 6 && k < cells.length; k++) cells[k].textContent = v[k]; }
    }); });
  });

  // ── 소식 (관리자 게시분 반영)
  var news = (cms.news || A.newsSeed || []).filter(function (n) { return n.published; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  var seedIds = (A.newsSeed || []).map(function (n) { return n.id; });
  function newsHref(n) { return seedIds.indexOf(n.id) >= 0 ? B + 'news/' + n.id + '/' : B + 'news/#' + n.id; }
  if (cms.news) {
    var latest = $('[data-news-latest]');
    if (latest) latest.innerHTML = news.slice(0, 3).map(function (n) { return '<a class="news-card reveal in" href="' + newsHref(n) + '"><span class="tag">' + esc(n.type) + '</span><h3>' + esc(n.title) + '</h3><p>' + esc(n.summary) + '</p><time>' + n.date.replace(/-/g, '.') + '</time></a>'; }).join('');
    var list = $('[data-news-list]');
    if (list) list.innerHTML = news.map(function (n) { return '<a class="news-row reveal in" id="' + esc(n.id) + '" href="' + newsHref(n) + '" data-type="' + esc(n.type) + '"><span class="tag">' + esc(n.type) + '</span><h3>' + esc(n.title) + '</h3><p>' + esc(n.summary) + '</p><time>' + n.date.replace(/-/g, '.') + '</time></a>'; }).join('');
  }

  // ── 관리자 에디터로 쓴 글 반영 (허용 태그만)
  function safeHtml(html) {
    var body = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html').body.firstChild;
    var OK = { P: 1, H3: 1, B: 1, STRONG: 1, EM: 1, UL: 1, OL: 1, LI: 1, A: 1, BR: 1, IMG: 1, SMALL: 1, BLOCKQUOTE: 1 };
    Array.prototype.slice.call(body.querySelectorAll('*')).reverse().forEach(function (el) {
      if (!OK[el.tagName]) { el.replaceWith.apply(el, Array.prototype.slice.call(el.childNodes)); return; }
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        var keep = (el.tagName === 'A' && a.name === 'href' && /^https?:\/\//i.test(a.value)) || (el.tagName === 'IMG' && ((a.name === 'src' && /^(https?:|data:image\/(png|jpe?g|webp);)/i.test(a.value)) || a.name === 'alt'));
        if (!keep) el.removeAttribute(a.name);
      });
      if (el.tagName === 'A') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener nofollow'); }
    });
    return body.innerHTML;
  }
  function bodyOf(n) { return n.bodyHtml ? safeHtml(n.bodyHtml) : String(n.body || '').split(/\n{2,}/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join(''); }
  var art = $('[data-news-id]');
  if (art && cms.news) {
    var mine = cms.news.filter(function (n) { return n.id === art.getAttribute('data-news-id'); })[0];
    if (mine) {
      var h = $('.phead .h1'); if (h) h.textContent = mine.title;
      $('[data-n-summary]', art).textContent = mine.summary;
      $('[data-n-date]', art).textContent = (mine.date || '').replace(/-/g, '.');
      $('[data-n-body]', art).innerHTML = bodyOf(mine);
      if (!mine.published) $('[data-n-body]', art).insertAdjacentHTML('beforebegin', '<p class="callout-s">게시 내린 글입니다.</p>');
    }
  }
  var view = $('[data-news-view]');
  function showView() {
    if (!view) return;
    var id = decodeURIComponent((location.hash || '').slice(1)), n = news.filter(function (x) { return x.id === id; })[0];
    if (!n || seedIds.indexOf(n.id) >= 0) { view.hidden = true; return; }
    view.hidden = false;
    view.innerHTML = '<article class="article news-art"><span class="tag">' + esc(n.type) + '</span><h2 class="h3" style="font-size:26px;margin-top:10px">' + esc(n.title) + '</h2><time>' + (n.date || '').replace(/-/g, '.') + '</time><p class="article-lead">' + esc(n.summary) + '</p>' + bodyOf(n) + '<p><a class="more" href="#">목록으로 ↑</a></p></article>';
    view.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  addEventListener('hashchange', showView); showView();

  $$('[data-news-filter]').forEach(function (bar) {
    $$('button', bar).forEach(function (b) { b.addEventListener('click', function () {
      $$('button', bar).forEach(function (x) { x.classList.toggle('on', x === b); });
      $$('.news-row').forEach(function (r) { r.hidden = b.dataset.type !== 'all' && r.dataset.type !== b.dataset.type; });
    }); });
  });

  // ── 팝업 (관리자에서 켜고 끔)
  var pop = $('#popup'), pd = Object.assign({}, A.popupSeed || {}, cms.popup || {});
  var today = new Date().toISOString().slice(0, 10);
  var hidden = false; try { hidden = localStorage.getItem('artera.popup.hide') === today; } catch (e) {}
  if (pop && pd.on && !EDITING && document.body.classList.contains('is-home') && !hidden && (!pd.start || pd.start <= today) && (!pd.end || pd.end >= today)) {
    $('[data-p=title]', pop).textContent = pd.title; $('[data-p=body]', pop).textContent = pd.body;
    $('[data-p=cta]', pop).textContent = pd.cta || '자세히 보기';
    $('[data-p=link]', pop).href = /^https?:/.test(pd.link) ? pd.link : B + (pd.link || '');
    setTimeout(function () { pop.hidden = false; }, 1600);
    function close() { if ($('[data-p=today]', pop).checked) try { localStorage.setItem('artera.popup.hide', today); } catch (e) {} pop.hidden = true; }
    $('[data-p=close]', pop).addEventListener('click', close);
    pop.addEventListener('click', function (e) { if (e.target === pop) close(); });
  }

  // ── 전면 공지 슬라이더
  $$('[data-slider]').forEach(function (s) {
    var fs = $$('.front', s), ds = $$('.front-dots button', s), pins = $$('[data-pins] .pin'), i = 0, t;
    function show(n) { fs[i].classList.remove('on'); ds[i].classList.remove('on'); if (pins[i]) pins[i].classList.remove('on'); i = (n + fs.length) % fs.length; fs[i].classList.add('on'); ds[i].classList.add('on'); if (pins[i]) pins[i].classList.add('on'); clearTimeout(t); t = setTimeout(function () { show(i + 1); }, 4000); }
    ds.forEach(function (d, n) { d.addEventListener('click', function () { show(n); }); });
    pins.forEach(function (d, n) { d.addEventListener('click', function () { show(n); }); });
    t = setTimeout(function () { show(1); }, 4000);
  });

  // ── 프리미엄 바로가기 강조
  var anc = $$('.anchor-nav a');
  if (anc.length && io) {
    var so = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) anc.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); }); }); }, { rootMargin: '-40% 0px -55% 0px' });
    anc.forEach(function (a) { var t = $(a.getAttribute('href')); if (t) so.observe(t); });
  }

  // ── 수익률 계산기
  var CALC = (function () {
    var seed = A.calcSeed || {}, mine = (cms.calc && cms.calc.units) || {}, out = {};
    Object.keys(seed).concat(Object.keys(mine)).forEach(function (no) { out[no] = Object.assign({}, seed[no] || {}, mine[no] || {}); });
    return out;
  })();
  var won = function (n) { return Math.round(n).toLocaleString('ko-KR') + '만원'; };
  $$('[data-calc]').forEach(function (f) {
    var EX = { price: 40000, deposit: 3000, rent: 200 }, base = {};
    function setBase(no) {
      var u = byNo[no], b = no ? (CALC[no] || {}) : {};
      ['price', 'deposit', 'rent'].forEach(function (k) {
        var has = b[k] > 0, tag = $('[data-base=' + k + ']', f);
        base[k] = has ? b[k] : (no && k === 'price' ? null : EX[k]);
        if (base[k] != null) f.elements[k].value = base[k];
        if (tag) tag.innerHTML = !no ? '' : has ? '기준값 ' + won(b[k]) + ' <button type="button" class="calc-reset" data-reset="' + k + '" hidden>기준값으로</button>' : (k === 'price' ? '상담 시 안내 · 직접 넣어 보세요' : '예시값 · 실제 조건 아님');
      });
      var info = $('[data-calc-info]', f);
      if (info) info.textContent = !u ? '호실을 고르면 기준값이 채워집니다' : u.no + '호 · ' + u.dong + '동 · 계약 ' + u.ctP.toFixed(2) + '평' + (b.price > 0 ? ' · 계약 3.3㎡당 ' + won(b.price / u.ctP) : ' · 이 호실 분양가는 홍보관 상담(' + ((A.site && A.site.phone) || '1551-4458') + ')에서 안내합니다');
    }
    function marks() {
      ['price', 'deposit', 'rent'].forEach(function (k) {
        var r = $('[data-reset=' + k + ']', f); if (r) r.hidden = !(base[k] != null && parseFloat(f.elements[k].value) !== base[k]);
      });
    }
    if (f.elements.unit) {
      f.elements.unit.addEventListener('change', function () { setBase(f.elements.unit.value); calc(); marks(); });
      f.addEventListener('click', function (e) { var r = e.target.closest('[data-reset]'); if (!r) return; f.elements[r.dataset.reset].value = base[r.dataset.reset]; calc(); marks(); });
      var pre = new URLSearchParams(location.search).get('unit');
      if (pre && byNo[pre]) { f.elements.unit.value = pre; setBase(pre); }
    }
    f.addEventListener('input', marks);
    function calc() {
      var v = function (n) { return parseFloat(f.elements[n].value) || 0; };
      var price = v('price'), dep = v('deposit'), rent = v('rent'), loanP = v('loan'), rate = v('rate'), tax = f.elements.tax ? v('tax') : 0;
      var loan = price * loanP / 100, interest = loan * rate / 100, taxAmt = price * tax / 100, own = price + taxAmt - dep - loan;
      $('[data-out=loan]', f).textContent = loanP;
      var y = own > 0 ? ((rent * 12 - interest) / own * 100) : 0;
      $('[data-out=yield]', f).textContent = own > 0 ? y.toFixed(2) + '%' : '-';
      $('[data-out=detail]', f).textContent = '실투자금 ' + Math.round(own).toLocaleString() + '만원(취득세 등 ' + Math.round(taxAmt).toLocaleString() + '만원 포함) · 연 임대수입 ' + (rent * 12).toLocaleString() + '만원' + (loan ? ' · 연 이자 ' + Math.round(interest).toLocaleString() + '만원' : '');
    }
    f.addEventListener('input', calc); calc();
  });

  // ── 면적표: 머리줄(구분행) 고정, 호실 줄만 움직이기
  function stickyRows() { $$('[data-sticky]').forEach(function (w) { var r = $('thead tr', w); if (r) w.style.setProperty('--h1', r.getBoundingClientRect().height + 'px'); }); }
  stickyRows(); addEventListener('resize', stickyRows);

  // ── 가격 막대: 절반 이상 보이면 차례로 자라고 숫자도 0부터, 마우스를 올리면 다시
  $$('[data-bars]').forEach(function (box) {
    var bars = $$('.bar', box), last = 0;
    bars.forEach(function (b, i) {
      b.style.transitionDelay = (i * 220) + 'ms';
      var v = $('b', b); if (!v) return;
      v.innerHTML = '<span data-count-to="' + v.textContent.replace(/[^\d.]/g, '') + '" data-delay="' + (i * 220) + '" data-dur="1100">0</span>';
    });
    // 11-06 막대 꼭대기 높이 점선(범위 표시): 막대 안에 두고 그래프 폭만큼 왼쪽으로 늘림
    var lvls = bars.map(function (b) { var l = document.createElement('i'); l.className = 'lvl'; l.setAttribute('aria-hidden', 'true'); b.appendChild(l); return l; });
    function placeLvls() {
      var pad = parseFloat(getComputedStyle(box).paddingLeft) || 0;
      bars.forEach(function (b, i) { lvls[i].style.left = (pad - b.offsetLeft) + 'px'; lvls[i].style.width = (box.clientWidth - pad * 2) + 'px'; });
    }
    placeLvls(); addEventListener('resize', placeLvls); addEventListener('load', placeLvls);
    function play() {
      last = Date.now();
      box.classList.add('reset'); box.classList.remove('go'); void box.offsetWidth;
      box.classList.remove('reset'); void box.offsetWidth; box.classList.add('go');
      $$('[data-count-to]', box).forEach(function (el) { countUp(el, true); });
    }
    if ('IntersectionObserver' in window && !REDUCE) {
      var bo = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { play(); bo.disconnect(); } }, { threshold: 0.5 });
      bo.observe(box);
    } else play();
    box.addEventListener('mouseenter', function () { if (Date.now() - last > 2500) play(); });
  });

  // ── 11-06 MD 구역 카드에 마우스(휴대폰은 누름) → 카드 바로 위 작은 배치도와 큰 배치도에서 그 구역 호실이 구역 색으로 반짝
  (function () {
    var fpBox = $('.fp'), cards = $$('[data-zone-card]'), mini = $('[data-md-mini]');
    if (!fpBox || !cards.length) return;
    // 작은 배치도: 큰 배치도 그림을 복사(걷는 점·id 겹침 빼고), 호실은 MD 구역 색
    if (mini) {
      var src = $('.fp-svg', fpBox), svg = src && src.cloneNode(true);
      if (svg) {
        $$('defs, .walkers', svg).forEach(function (x) { x.parentNode.removeChild(x); });
        var im = $('.fp-img', svg); if (im && im.getAttribute('data-href')) { im.setAttribute('href', im.getAttribute('data-href')); im.removeAttribute('data-href'); }
        svg.removeAttribute('aria-label'); svg.setAttribute('class', 'md-mini-svg');
        $$('.u', svg).forEach(function (g) {
          var u = UNITS[IDX[g.getAttribute('data-no')]], z = u && u.zone && ZONES[u.zone];
          g.removeAttribute('tabindex'); g.classList.remove('on', 'dim');
          g.style.setProperty('--f', z ? z.color : '#C9CDD8'); g.style.setProperty('--t', z ? '#fff' : '#1F2761');
        });
        mini.appendChild(svg);
      }
    }
    var roots = [fpBox].concat(mini ? [mini] : []), timer = 0;
    function spot(k) {
      clearTimeout(timer);
      roots.forEach(function (root) {
        root.classList.toggle('spotting', !!k);
        $$('.u', root).forEach(function (g) {
          var u = UNITS[IDX[g.getAttribute('data-no')]], hit = !!(k && u && u.zone === k);
          g.classList.toggle('spot', hit);
          if (hit) g.style.setProperty('--zc', ZONES[k].color);
        });
      });
      cards.forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-zone-card') === k); });
    }
    cards.forEach(function (c) {
      var k = c.getAttribute('data-zone-card');
      c.addEventListener('mouseenter', function () { spot(k); });
      c.addEventListener('mouseleave', function () { spot(null); });
      c.addEventListener('click', function () { spot(k); timer = setTimeout(function () { spot(null); }, 4500); });
    });
  })();

  // ── 문의 폼 (시안: 브라우저에 저장 → 관리자 '문의 접수'에서 확인)
  var params = new URLSearchParams(location.search);
  var utm = ['utm_source', 'utm_medium', 'utm_campaign'].reduce(function (o, k) { var v = params.get(k) || sessionStorage.getItem(k); if (v) { o[k] = v; sessionStorage.setItem(k, v); } return o; }, {});
  $$('[data-form]').forEach(function (f) {
    var kind = 'invest';
    var tabs = $$('.qtabs button, .rtabs button', f);
    function setKind(k) {
      kind = k; tabs.forEach(function (t) { t.classList.toggle('on', t.dataset.kind === k); });
      $$('[data-only]', f).forEach(function (s) { s.hidden = s.dataset.only !== k; });
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { setKind(t.dataset.kind); }); });
    var pk = params.get('kind') || (location.hash || '').slice(1);
    if (['invest', 'lease', 'agent'].indexOf(pk) >= 0) setKind(pk);
    if (params.get('unit') && f.elements.unit) f.elements.unit.value = params.get('unit');
    if (params.get('unit') && f.elements.msg) f.elements.msg.value = params.get('unit') + '호 문의드립니다.';
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('[data-msg]', f);
      var name = f.elements.name.value.trim(), phone = f.elements.phone.value.replace(/[^0-9]/g, '');
      if (!name || phone.length < 9) { msg.className = 'form-msg err'; msg.textContent = '이름과 연락처를 확인해 주세요.'; return; }
      if (!f.elements.agree.checked) { msg.className = 'form-msg err'; msg.textContent = '개인정보 수집·이용 동의가 필요합니다.'; return; }
      var data = { id: Date.now().toString(36), at: new Date().toISOString(), kind: kind, page: location.pathname.replace(B, '/'), status: '신규' };
      $$('input,select,textarea', f).forEach(function (el) { if (el.name && el.type !== 'checkbox') data[el.name] = el.value; });
      data.mkt = f.elements.mkt ? f.elements.mkt.checked : false; data.utm = utm;
      try { var c = JSON.parse(localStorage.getItem(KEY) || '{}'); c.inquiries = c.inquiries || []; c.inquiries.unshift(data); localStorage.setItem(KEY, JSON.stringify(c)); } catch (err) {}
      msg.className = 'form-msg ok'; msg.textContent = '접수되었습니다. 상담 가능 시간(' + ((A.site || {}).callHours || '') + ')에 연락드리겠습니다.';
      f.reset(); setKind(kind);
    });
  });
})();
