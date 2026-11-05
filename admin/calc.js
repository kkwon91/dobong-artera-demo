/* 관리자 '계산기 기준값' — 홈페이지 수익률 계산기에서 호실을 고르면 채워질 분양가·보증금·월세(만원).
   비워 둔 칸은 홈페이지에서 분양가 '상담 시 안내', 보증금·월세 '예시값'으로 나온다.
   10-29 질문 답변: 호실별 가격표·임대조건표는 웹 비공개 → 넣기 전에 조합·분양대행 공개 동의 필요. */
(window.ARTERA_ADMIN_EXT = window.ARTERA_ADMIN_EXT || []).push(function (K) {
  var A = K.A, esc = K.esc, $ = K.$, $$ = K.$$, db = K.db;
  var KEYS = [['price', '분양가'], ['deposit', '보증금'], ['rent', '월세']];
  function merged(no) { return Object.assign({}, (A.calcSeed || {})[no] || {}, ((db.calc || {}).units || {})[no] || {}); }
  var won = function (n) { return Math.round(n).toLocaleString('ko-KR'); };

  function view(v) {
    var filled = A.units.filter(function (u) { return merged(u.no).price > 0; }).length;
    v.innerHTML =
      '<div class="card"><h2>수익률 계산기 기준값</h2>' +
      '<p class="d">홈페이지 <b>프리미엄 › 수익률 계산기</b>에서 방문자가 호실을 고르면 여기 넣은 숫자가 채워집니다. 방문자는 숫자를 바꿔 다시 계산해 볼 수 있습니다. 비워 둔 칸은 분양가 "상담 시 안내", 보증금·월세 "예시값"으로 나옵니다.</p>' +
      '<div class="warn"><b>공개 범위 확인</b><ul><li>10-29 질문 답변에서 호실별 가격표·임대조건표는 <b>웹 비공개</b>로 정했습니다. 지금은 이미 공개된 114호 예시 분양가(39,621만원)만 들어 있습니다.</li><li>다른 호실 숫자를 넣기 전에 조합·분양대행의 공개 동의를 받아 주세요. 넣는 순간 홈페이지 계산기에 나옵니다.</li></ul></div>' +
      '<p class="d">분양가가 들어간 호실 <b data-calc-filled>' + filled + '</b> / 29</p>' +
      '<div class="tbl-wrap"><table class="calc-t"><thead><tr><th>호실</th><th>계약면적</th>' + KEYS.map(function (k) { return '<th>' + k[1] + ' (만원)</th>'; }).join('') + '<th>계약 3.3㎡당</th></tr></thead><tbody>' +
      A.units.map(function (u) {
        var b = merged(u.no);
        return '<tr data-no="' + u.no + '"><th>' + u.no + '호 <small class="muted">' + u.dong + '동</small></th><td>' + u.ctP.toFixed(2) + '평</td>' +
          KEYS.map(function (k) { return '<td><input type="number" min="0" step="' + (k[0] === 'rent' ? 5 : 100) + '" data-k="' + k[0] + '" value="' + (b[k[0]] > 0 ? b[k[0]] : '') + '" placeholder="비움" aria-label="' + u.no + '호 ' + k[1] + '"></td>'; }).join('') +
          '<td data-per>' + (b.price > 0 ? won(b.price / u.ctP) + '만원' : '-') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="row" style="margin-top:14px;gap:8px"><button class="btn btn-n" data-calc-save>저장</button><button class="btn btn-line" data-calc-clear>내가 넣은 값 모두 지우기</button><a class="btn btn-line" href="../premium/#calc" target="_blank" rel="noopener">홈페이지 계산기 열기 ↗</a></div></div>';

    $$('input[data-k=price]', v).forEach(function (inp) {
      inp.addEventListener('input', function () {
        var tr = inp.closest('tr'), u = A.units.filter(function (x) { return x.no === tr.dataset.no; })[0], p = parseFloat(inp.value);
        $('[data-per]', tr).textContent = p > 0 ? won(p / u.ctP) + '만원' : '-';
      });
    });
    $('[data-calc-save]', v).addEventListener('click', function () {
      var units = {}, n = 0;
      $$('tbody tr', v).forEach(function (tr) {
        var o = {};
        $$('input', tr).forEach(function (inp) { var x = parseFloat(inp.value); if (x > 0) o[inp.dataset.k] = Math.round(x); });
        var seed = (A.calcSeed || {})[tr.dataset.no] || {};
        // 기본값과 같으면 저장 안 함, 기본값을 지우면 0 으로 남겨 '비움'을 기억
        var diff = {};
        KEYS.forEach(function (k) { var a = o[k[0]] || 0, s = seed[k[0]] || 0; if (a !== s) diff[k[0]] = a; });
        if (Object.keys(diff).length) { units[tr.dataset.no] = diff; n++; }
      });
      db.calc = { units: units };
      K.log('계산기 기준값 저장 — 바꾼 호실 ' + n + '개');
      K.save('계산기 기준값을 저장했습니다');
      view(v);
    });
    $('[data-calc-clear]', v).addEventListener('click', function () {
      if (!confirm('관리자에서 넣은 계산기 기준값을 모두 지울까요? (114호 예시 분양가만 남습니다)')) return;
      delete db.calc; K.log('계산기 기준값 초기화'); K.save('지웠습니다'); view(v);
    });
  }
  K.TITLES.calc = '계산기 기준값';
  K.VIEWS.calc = view;
});
