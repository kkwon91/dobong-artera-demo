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
  function displayLabel(u) {
    if (u.s.sale === 'sold' && u.s.lease === 'open') return '분양완료';
    return leaseOf(u).label;
  }
  function displayColor(u) {
    if (u.s.sale === 'sold' && u.s.lease === 'open') return { color: '#9AA1B4', text: '#fff' };
    return leaseOf(u);
  }
  function counts() {
    var c = { operating: 0, leased: 0, loi: 0, open: 0, sold: 0, soldOpen: 0 };
    UNITS.forEach(function (u) {
      if (u.s.sale === 'sold') c.sold++;
      if (u.s.sale === 'sold' && u.s.lease === 'open') c.soldOpen++;
      else c[u.s.lease]++;
    });
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
      ['operating', '영업 중', C.operating], ['leased', '임차 확정', C.leased], ['loi', 'LOI 접수', C.loi], ['open', '모집 중', C.open + C.soldOpen]
    ].map(function (x) { var l = LEASE[x[0]]; return '<span class="chip"><i style="background:' + (x[0] === 'open' ? '#fff' : l.color) + '"></i>' + x[1] + ' <b>' + x[2] + '</b></span>'; }).join(' · ') +
      ' <a href="' + B + 'floorplan/">배치도에서 보기</a>';
  }

  // ── 사업 정보 (관리자에서 수정)
  if (cms.site && cms.site.owners) {
    var dl = $('[data-owners]');
    if (dl) dl.innerHTML = cms.site.owners.map(function (o) { return '<div><dt>' + esc(o[0]) + '</dt><dd>' + esc(o[1]) + '</dd></div>'; }).join('');
  }

  // ── 등장 · 숫자 올라가기
  function countUp(el) {
    if (el.dataset.done) return; el.dataset.done = 1;
    var to = parseFloat(el.getAttribute('data-count-to')), dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var t0 = performance.now(), dur = 1400;
    function f(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3), v = to * e;
      el.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('ko-KR');
      if (p < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
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

  // ── 히어로 슬라이드 + 영상
  var hero = $('[data-hero]');
  if (hero) {
    var slides = $$('.hero-slide', hero), dots = $$('.hero-nav button', hero), cur = 0, timer;
    function go(i) {
      slides[cur].classList.remove('on'); dots[cur].classList.remove('on');
      cur = (i + slides.length) % slides.length;
      slides[cur].classList.add('on'); dots[cur].classList.remove('on'); void dots[cur].offsetWidth; dots[cur].classList.add('on');
      clearTimeout(timer); if (!EDITING) timer = setTimeout(function () { go(cur + 1); }, 9500);
    }
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
    if (!EDITING) timer = setTimeout(function () { go(1); }, 9500);
  }
  // 영상 파일이 있을 때만 재생 (없으면 이미지 유지)
  $$('video[data-video]').forEach(function (v) {
    var src = (innerWidth < 900 && v.getAttribute('data-video-sm')) || v.getAttribute('data-video');
    function load() {
      v.addEventListener('playing', function () { v.classList.add('ready'); }, { once: true });
      v.addEventListener('error', function () { v.remove(); }, { once: true });
      v.muted = true; v.preload = 'auto'; v.src = src; v.load();
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }
    if (io) { var vo = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { load(); vo.disconnect(); } }); vo.observe(v.parentNode); } else load();
  });

  // ── 입점 현황 보드
  $$('[data-cells]').forEach(function (box) {
    var rows = [1, 2, 3].map(function (d) {
      return '<div class="cells-row"><span class="lbl">' + d + '동</span>' + UNITS.filter(function (u) { return u.dong === d; }).map(function (u, i) {
        var c = displayColor(u), open = u.s.lease === 'open' && u.s.sale !== 'sold';
        return '<button class="cell' + (open ? ' open' : '') + '" style="background:' + (open ? '' : c.color) + ';transition-delay:' + (i * 40) + 'ms;flex-grow:' + u.ex + '" data-cell="' + u.no + '" title="' + u.no + '호 · ' + displayLabel(u) + (u.s.brand ? ' · ' + esc(u.s.brand) : '') + '">' + u.no + '</button>';
      }).join('') + '</div>';
    }).join('');
    box.innerHTML = '<div><p class="eyebrow" style="margin:0">29개 호실 한눈에</p></div>' + rows +
      '<div class="cells-legend"><span><i style="background:' + LEASE.operating.color + '"></i>영업 중</span><span><i style="background:' + LEASE.leased.color + '"></i>임차 확정</span><span><i style="background:' + LEASE.loi.color + '"></i>LOI 접수</span><span><i style="background:#9AA1B4"></i>분양완료</span><span><i style="background:#fff;border:1.5px dashed #C9D0E4"></i>모집 중</span></div>';
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cell]'); if (!b) return;
      var fp = $('[data-fp]');
      if (fp) { fp.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { selectUnit(fp, b.getAttribute('data-cell')); }, 500); }
      else location.href = B + 'floorplan/#u' + b.getAttribute('data-cell');
    });
  });
  $$('[data-stats]').forEach(function (box) {
    box.innerHTML = [
      ['영업 중', C.operating, LEASE.operating.color, 'LX지인 · 컴포즈커피'],
      ['임차 확정', C.leased, LEASE.leased.color, '이마트 에브리데이'],
      ['LOI 접수', C.loi, LEASE.loi.color, '입점의향서 단계 · 입점 확정 아님'],
      ['분양완료', C.sold, '#9AA1B4', '105 · 110 · 203 · 209호'],
    ].map(function (s) { return '<div class="stat" style="--c:' + s[2] + '"><b><span data-count-to="' + s[1] + '">' + s[1] + '</span><small>' + (s[4] || '실') + '</small></b><span>' + s[0] + '</span><small class="d">' + s[3] + '</small></div>'; }).join('');
    if (io) io.observe(box);
  });
  $$('[data-brands]').forEach(function (box) {
    var seen = {}, list = [];
    UNITS.forEach(function (u) {
      if (!u.s.brand || u.s.lease === 'open') return;
      if (!seen[u.s.brand]) { seen[u.s.brand] = { brand: u.s.brand, units: [], lease: u.s.lease, note: u.s.note }; list.push(seen[u.s.brand]); }
      seen[u.s.brand].units.push(u.no);
    });
    var order = { operating: 0, leased: 1, loi: 2 };
    list.sort(function (a, b) { return order[a.lease] - order[b.lease]; });
    box.innerHTML = list.map(function (x) {
      var l = LEASE[x.lease];
      var range = x.units.length > 2 ? x.units[0] + '~' + x.units[x.units.length - 1] + '호' : x.units.join('·') + '호';
      var lg = logoOf(x.brand);
      return '<div class="brand"><span class="bs" style="background:' + l.color + '">' + l.label + '</span><div class="blogo">' + (lg ? '<img src="' + lg + '" alt="' + esc(x.brand) + ' 로고" loading="lazy">' : '<b class="bn">' + esc(x.brand) + '</b>') + '</div><b class="bn2">' + esc(x.brand) + '</b><span class="bu">' + range + ' · ' + esc((x.note || '').split('·')[0]) + '</span></div>';
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
      : [['operating'], ['leased'], ['loi']].map(function (k) { var l = LEASE[k[0]]; return '<span><i style="background:' + l.color + '"></i>' + l.label + '</span>'; }).join('') + '<span><i style="background:#9AA1B4"></i>분양완료</span><span><i style="background:#fff"></i>모집 중</span>';
    var ct = $('[data-count]', fp);
    if (ct) ct.innerHTML = [['영업 중', C.operating, LEASE.operating.color], ['임차 확정', C.leased, LEASE.leased.color], ['LOI 접수', C.loi, LEASE.loi.color], ['분양완료(공실)', C.soldOpen, '#9AA1B4'], ['임차인 모집 중', C.open, '#fff']]
      .map(function (r) { return '<div><span><i style="background:' + r[2] + '"></i>' + r[0] + '</span><b>' + r[1] + '실</b></div>'; }).join('');
  }
  function panelHtml(u) {
    var c = displayColor(u), z = u.zone ? ZONES[u.zone] : null;
    return '<div class="pn"><button class="pn-close" aria-label="닫기">✕</button>' +
      '<div class="pn-top"><span class="pn-no">' + u.no + '<small>호 · ' + u.dong + '동</small></span><span class="pn-st" style="background:' + c.color + ';color:' + c.text + (c.color === '#FFFFFF' ? ';border:1.5px solid #1F2761' : '') + '">' + displayLabel(u) + '</span></div>' +
      (u.s.brand ? '<div class="pn-brand">' + (logoOf(u.s.brand) ? '<img class="pn-logo" src="' + logoOf(u.s.brand) + '" alt="' + esc(u.s.brand) + ' 로고">' : '') + '<b>' + esc(u.s.brand) + '</b><span>' + esc(u.s.note) + '</span>' + (u.s.lease === 'loi' ? '<em class="pn-loi">LOI는 입점 확정이 아닌 협의 단계입니다</em>' : '') + '</div>' : '<div class="pn-brand"><b>' + (u.s.sale === 'sold' ? '분양완료 호실' : '입점 브랜드 모집 중') + '</b><span>' + esc(u.s.note || (z ? z.md + ' 업종 추천' : '업종 제한 없이 상담')) + '</span></div>') +
      '<dl class="pn-dl"><div><dt>전용면적</dt><dd>' + u.ex.toFixed(2) + '㎡ <small>' + u.exP.toFixed(2) + '평</small></dd></div><div><dt>계약면적</dt><dd>' + u.ct.toFixed(2) + '㎡ <small>' + u.ctP.toFixed(2) + '평</small></dd></div>' +
      '<div><dt>분양</dt><dd>' + (A.sale[u.s.sale] || '분양 예정') + '</dd></div><div><dt>임차</dt><dd>' + leaseOf(u).label + '</dd></div></dl>' +
      (z ? '<p class="pn-zone"><i style="background:' + z.color + '"></i><span><b>' + z.label + '</b> · ' + esc(z.where) + '<br>' + esc(z.md) + '</span></p>' : '') +
      '<div class="pn-btns"><a class="btn btn-navy" href="' + B + 'units/' + u.no + '/">' + u.no + '호 자세히 보기</a>' + (u.s.sale !== 'sold' ? '<a class="btn btn-orange" href="' + B + 'register/?kind=invest&unit=' + u.no + '#invest">이 호실 투자 문의</a>' : '') +
      (u.s.lease === 'open' || u.s.lease === 'loi' ? '<a class="btn btn-line" href="' + B + 'register/?kind=lease&unit=' + u.no + '#lease">이 호실 임차 문의</a>' : '') + '</div></div>';
  }
  function selectUnit(fp, no) {
    var u = byNo[no]; if (!u) return;
    $$('.u', fp).forEach(function (g) { g.classList.toggle('on', g.getAttribute('data-no') === no); });
    var p = $('[data-panel]', fp); p.innerHTML = panelHtml(u);
    var cl = $('.pn-close', p); if (cl) cl.addEventListener('click', function () { $$('.u', fp).forEach(function (g) { g.classList.remove('on'); }); p.innerHTML = '<div class="fp-empty"><p class="eyebrow">29개 호실</p><h3>호실을 고르면<br>정보가 여기에 나타납니다</h3><div class="fp-count" data-count></div></div>'; paint(fp); });
    var h = $('.fp-hint', fp); if (h) h.classList.add('hide');
    if (innerWidth < 1180) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function showTip(e, u) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'fp-tip'; document.body.appendChild(tip); }
    var c = displayColor(u);
    tip.innerHTML = '<b>' + u.no + '호</b><span class="t-st" style="background:' + c.color + ';color:' + c.text + (c.color === '#FFFFFF' ? ';border:1px solid #1F2761' : '') + '">' + displayLabel(u) + '</span>' +
      (u.s.brand ? '<span class="t-br">' + esc(u.s.brand) + '</span>' : '') +
      '<span class="t-m">전용 ' + u.exP.toFixed(2) + '평 · 계약 ' + u.ctP.toFixed(2) + '평</span>' +
      (u.zone ? '<span class="t-m">' + ZONES[u.zone].label + '</span>' : '');
    tip.hidden = false;
    var x = e.clientX, y = e.clientY, w = 230;
    tip.style.left = (x + w + 30 > innerWidth ? x - w - 30 : x) + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }
  $$('[data-fp]').forEach(function (fp) {
    fp.dataset.mode = 'lease'; fp.dataset.dong = 'all';
    paint(fp);
    $$('[data-mode]', fp).forEach(function (b) { b.addEventListener('click', function () { $$('[data-mode]', fp).forEach(function (x) { x.classList.toggle('on', x === b); }); fp.dataset.mode = b.dataset.mode; paint(fp); }); });
    $$('[data-dong]', fp).forEach(function (b) { b.addEventListener('click', function () { $$('[data-dong]', fp).forEach(function (x) { x.classList.toggle('on', x === b); }); fp.dataset.dong = b.dataset.dong; paint(fp); }); });
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
  });

  // 면적표 현황 칸 갱신 + 동 필터
  $$('[data-unit-status]').forEach(function (td) { var u = byNo[td.getAttribute('data-unit-status')]; if (!u) return; td.textContent = displayLabel(u) + (u.s.brand ? ' · ' + u.s.brand + (u.s.lease === 'loi' ? ' (입점의향서 접수 — 입점 확정 아님)' : '') : ''); });
  $$('[data-row]').forEach(function (tr) {
    var u = byNo[tr.getAttribute('data-row')]; if (!u) return;
    var td = $('[data-cell-status]', tr);
    if (td) td.textContent = u.s.sale === 'sold' ? '분양완료' + (u.s.lease === 'operating' ? ' · ' + u.s.brand + ' 영업 중' : '') : leaseOf(u).label + (u.s.brand ? ' · ' + u.s.brand : '');
    tr.classList.toggle('sold', u.s.sale === 'sold');
  });
  $$('[data-tbl-filter]').forEach(function (bar) {
    var tbl = bar.nextElementSibling && $('table', bar.nextElementSibling);
    $$('button', bar).forEach(function (b) { b.addEventListener('click', function () {
      $$('button', bar).forEach(function (x) { x.classList.toggle('on', x === b); });
      $$('tbody tr', tbl).forEach(function (tr) { tr.hidden = b.dataset.dong !== 'all' && tr.dataset.dong !== b.dataset.dong; });
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
  $$('[data-calc]').forEach(function (f) {
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
