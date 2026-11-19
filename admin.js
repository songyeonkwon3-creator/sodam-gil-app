/* ==========================================================================
   admin.js — EP01 관리자 페이지
   · 유저 관리 : 계정별 스토리/학습/진행 상태
   · 앱 관리   : 에피소드 정보, 앱 설정(번역 기본값·카드 시간·힌트), 오늘 배운 것 콘텐츠
   · 데이터     : JSON 내보내기 / 가져오기
   앱과 같은 localStorage 를 읽고 쓴다 (프로토타입 한정).
   ========================================================================== */
(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const Auth = window.EP.Auth;
  const Content = window.EP.Content;

  let selected = null;

  /* ---------- 공통 ---------- */
  const toastEl = $('#toast');
  let toastT = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('on'), 1800);
  }

  const fmt = ts => {
    if (!ts) return '—';
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const ago = ts => {
    if (!ts) return '—';
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return '방금';
    if (s < 3600) return Math.round(s / 60) + '분 전';
    if (s < 86400) return Math.round(s / 3600) + '시간 전';
    return Math.round(s / 86400) + '일 전';
  };

  /* 읽기 전용 스냅샷 : 앱이 저장한 유저별 story/learning/progress 를 그대로 보여 준다 */
  const storyOf = u => Object.assign({
    player_name: '', motivation: null, met_hodu: false, sunja_first_impression: null,
    room_key: false, inspected_window: false, inspected_bed: false, box_found: false,
    photo_clues: [], photo_response: null, reply: null, day1_completed: false
  }, u.story || {});

  const learnOf = u => Object.assign({
    shoe_first_try_correct: null, shoe_hint_level: 0, attempts: {}, hint_unlocks: {}
  }, u.learning || {});

  const progressOf = u => {
    const p = u.progress || {};
    const total = (window.EP.SCENES || []).length || 9;
    const scene = Math.max(0, Math.min(total - 1, p.scene || 0));
    return { scene, total, pct: Math.round(((scene + 1) / total) * 100), cursor: p.cursor || 0, at: p.updatedAt };
  };

  /* ---------- 탭 ---------- */
  $$('.tab').forEach(t => t.addEventListener('click', () => {
    $$('.tab').forEach(x => x.setAttribute('aria-selected', String(x === t)));
    ['users', 'app', 'data'].forEach(k => {
      const p = $('#p-' + k);
      if (p) p.hidden = (k !== t.dataset.tab);
    });
  }));

  /* ---------- 유저 목록 ---------- */
  function renderStats() {
    const list = Auth.list();
    const done = list.filter(u => storyOf(u).day1_completed).length;
    const today = list.filter(u => (u.lastSeenAt || 0) > Date.now() - 864e5).length;
    const withHodu = list.filter(u => storyOf(u).met_hodu).length;
    $('#stats').innerHTML = `
      <div class="stat"><div class="k">전체 유저</div><div class="v">${list.length}</div><div class="s">이 브라우저 기준</div></div>
      <div class="stat"><div class="k">DAY 1 완료</div><div class="v">${done}</div><div class="s">${list.length ? Math.round(done / list.length * 100) : 0}% 완주</div></div>
      <div class="stat"><div class="k">오늘 접속</div><div class="v">${today}</div><div class="s">최근 24시간</div></div>
      <div class="stat"><div class="k">호두 조우</div><div class="v">${withHodu}</div><div class="s">보상 조건부 항목</div></div>`;
    $('#userCount').textContent = list.length + '명';
  }

  const av = u => {
    const cls = u.provider === 'apple' ? 'apple' : u.provider === 'guest' ? 'guest' : '';
    const ch = u.provider === 'apple' ? '' : u.provider === 'google' ? 'G' : '·';
    return `<span class="av ${cls}">${ch || 'A'}</span>`;
  };

  function renderUsers() {
    const list = Auth.list();
    const tb = $('#userRows');
    if (!list.length) {
      tb.innerHTML = `<tr><td colspan="5">
        <div class="empty"><b>아직 유저가 없습니다</b>
        앱(index.html)에서 Google · Apple · 게스트 중 하나로 시작하면 이곳에 계정이 생깁니다.</div>
      </td></tr>`;
      return;
    }
    tb.innerHTML = list.map(u => {
      const p = progressOf(u), s = storyOf(u);
      return `<tr data-id="${u.id}" class="${u.id === selected ? 'sel' : ''}">
        <td class="nm"><span class="who">${av(u)}<span>${esc(u.name || '—')}<br>
          <span class="mono">${esc(u.email || '—')}</span></span></span></td>
        <td><span class="tag">${Auth.label(u.provider)}</span></td>
        <td><span class="bar"><i style="width:${p.pct}%"></i></span><br>
          <span class="mono">S${String(p.scene + 1).padStart(2, '0')} · ${p.pct}%</span></td>
        <td>${s.day1_completed ? '<span class="tag ok">완료</span>' : '<span class="tag no">진행 중</span>'}</td>
        <td class="mono">${ago(u.lastSeenAt)}</td>
      </tr>`;
    }).join('');
    tb.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => {
      selected = tr.dataset.id;
      renderUsers(); renderDetail();
    }));
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const yes = v => v ? '<span class="on">true</span>' : '<span class="off">false</span>';

  function renderDetail() {
    const u = selected ? Auth.get(selected) : null;
    const body = $('#detailBody');
    if (!u) {
      $('#dName').textContent = '유저를 선택하세요';
      $('#dId').textContent = '';
      body.innerHTML = `<div class="empty"><b>왼쪽에서 유저를 고르세요</b>스토리 스토어와 학습 스토어를 나눠서 보여 줍니다. 학습 값은 내부 기록 전용입니다.</div>`;
      return;
    }
    const s = storyOf(u), l = learnOf(u), p = progressOf(u);
    $('#dName').textContent = u.name || '이름 없음';
    $('#dId').textContent = u.id;

    const clue = (s.photo_clues || []).length;
    const rows = [
      ['player_name', esc(s.player_name || '‘손님’ (미입력)')],
      ['motivation', esc(s.motivation || '—')],
      ['sunja_first_impression', esc(s.sunja_first_impression || '—')],
      ['photo_response', esc(s.photo_response || '—')],
      ['reply', esc(s.reply || '—')],
      ['met_hodu', yes(s.met_hodu)],
      ['room_key', yes(s.room_key)],
      ['inspected_window', yes(s.inspected_window)],
      ['inspected_bed', yes(s.inspected_bed)],
      ['box_found', yes(s.box_found)],
      ['photo_clues', `${clue}/3 <span class="${clue === 3 ? 'on' : 'off'}">[${(s.photo_clues || []).join(', ')}]</span>`],
      ['day1_completed', yes(s.day1_completed)]
    ].map(([k, v]) => `<div class="kv"><b>${k}</b><span>${v}</span></div>`).join('');

    const learnRows = [
      ['shoe_first_try_correct', String(l.shoe_first_try_correct)],
      ['shoe_hint_level', String(l.shoe_hint_level)],
      ['attempts', esc(JSON.stringify(l.attempts || {}))]
    ].map(([k, v]) => `<div class="kv"><b>${k}</b><span>${v}</span></div>`).join('');

    body.innerHTML = `
      <div class="sec-t" style="margin-top:0">계정</div>
      <div class="kv"><b>provider</b><span>${Auth.label(u.provider)}</span></div>
      <div class="kv"><b>email</b><span>${esc(u.email || '—')}</span></div>
      <div class="kv"><b>created</b><span>${fmt(u.createdAt)}</span></div>
      <div class="kv"><b>last seen</b><span>${fmt(u.lastSeenAt)}</span></div>

      <div class="sec-t">진행</div>
      <div class="kv"><b>scene</b><span>S${String(p.scene + 1).padStart(2, '0')} / S${String(p.total).padStart(2, '0')} · ${p.pct}%</span></div>
      <div class="kv"><b>cursor</b><span>${p.cursor}</span></div>
      <div class="kv"><b>saved</b><span>${p.at ? fmt(p.at) : '—'}</span></div>

      <div class="sec-t">스토리 스토어 <span class="tag">관계·진행</span></div>
      ${rows}

      <div class="sec-t">학습 스토어 <span class="tag learn">내부 기록 전용</span></div>
      ${learnRows}

      <div class="acts" style="margin-top:22px">
        <button class="btn sm" id="openAs" type="button">이 계정으로 앱 열기</button>
        <button class="btn sm danger" id="delUser" type="button">계정 삭제</button>
      </div>`;

    $('#openAs').addEventListener('click', () => {
      try { localStorage.setItem('ep01.session.v1', JSON.stringify({ id: u.id, provider: u.provider, at: Date.now() })); } catch (e) {}
      toast('세션을 바꿨습니다 — 앱에서 이어서 시작하세요');
    });
    $('#delUser').addEventListener('click', () => {
      if (!confirm(`${u.name || u.id} 계정과 저장된 진행을 삭제할까요?`)) return;
      Auth.remove(u.id);
      selected = null;
      renderStats(); renderUsers(); renderDetail();
      toast('삭제했습니다');
    });
  }

  /* ---------- 앱 관리 ---------- */
  let draftVocab = [], draftGram = [];

  const vRow = (v, i) => `
    <div class="row3" data-i="${i}" style="margin-bottom:8px">
      <input type="text" class="v-word" value="${esc(v.word)}" placeholder="여기">
      <input type="text" class="v-ko" value="${esc(v.ko)}" placeholder="이곳">
      <input type="text" class="v-en" value="${esc(v.en)}" placeholder="here">
      <input type="text" class="v-roman" value="${esc(v.roman || '')}" placeholder="yeogi" style="grid-column:1/2">
      <input type="text" class="v-scene" value="${esc(v.scene || '')}" placeholder="S02" style="grid-column:2/2">
      <button class="btn sm danger g-del" type="button" style="grid-column:3/4">삭제</button>
    </div>`;

  const gRow = (g, i) => `
    <div data-i="${i}" style="margin-bottom:10px; padding-bottom:10px; border-bottom:1px dashed rgba(36,31,27,.12)">
      <div class="row2">
        <input type="text" class="g-form" value="${esc(g.form)}" placeholder="-아요 / -어요">
        <input type="text" class="g-ko" value="${esc(g.ko)}" placeholder="언제 쓰는 말인지">
      </div>
      <div class="row2" style="margin-top:8px">
        <input type="text" class="g-eg" value="${esc(g.eg)}" placeholder="비가 와요.">
        <input type="text" class="g-meaning" value="${esc(g.meaning || '')}" placeholder="It's raining.">
      </div>
      <button class="btn sm danger g-del" type="button" style="margin-top:8px">삭제</button>
    </div>`;

  function renderVocab() {
    $('#vocabList').innerHTML = draftVocab.map(vRow).join('');
    $('#vocabList').querySelectorAll('.g-del').forEach(b => b.addEventListener('click', e => {
      draftVocab.splice(+e.target.closest('[data-i]').dataset.i, 1);
      renderVocab();
    }));
  }
  function renderGram() {
    $('#gramList').innerHTML = draftGram.map(gRow).join('');
    $('#gramList').querySelectorAll('.g-del').forEach(b => b.addEventListener('click', e => {
      draftGram.splice(+e.target.closest('[data-i]').dataset.i, 1);
      renderGram();
    }));
  }

  /* input.value 는 프로퍼티라 일부 렌더러(스크린샷)에서 보이지 않는다.
     값이 보이도록 attribute 도 같이 맞춘다. */
  const setVal = (sel, v) => {
    const el = $(sel);
    if (!el) return;
    el.value = v == null ? '' : v;
    el.setAttribute('value', v == null ? '' : v);
  };

  function loadApp() {
    const C = Content.data;
    const ep = C.episode || {};
    setVal('#epSeries', ep.series || '');
    setVal('#epNo', ep.no || '');
    setVal('#epTitle', ep.title || '');
    setVal('#epDay', ep.day || '');
    setVal('#epNext', ep.nextTitle || '');
    draftVocab = (C.vocab || []).map(v => Object.assign({}, v));
    draftGram = (C.grammar || []).map(g => Object.assign({}, g));
    renderVocab(); renderGram();

    const st = C.settings || {};
    $('#swTrans').setAttribute('aria-pressed', String(!!st.translateDefault));
    $('#swHint').setAttribute('aria-pressed', String(!!st.hintAuto));
    setVal('#cardMs', st.cardAutoMs || 4500);
  }

  $('#swTrans').addEventListener('click', e => {
    const b = e.currentTarget;
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
  });
  $('#swHint').addEventListener('click', e => {
    const b = e.currentTarget;
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
  });

  $('#addVocab').addEventListener('click', () => {
    draftVocab.push({ word: '', roman: '', ko: '', en: '', scene: '' });
    renderVocab();
  });
  $('#addGram').addEventListener('click', () => {
    draftGram.push({ form: '', ko: '', eg: '', meaning: '' });
    renderGram();
  });

  const collectVocab = () => $$('#vocabList [data-i]').map(r => ({
    word: r.querySelector('.v-word').value.trim(),
    roman: r.querySelector('.v-roman').value.trim(),
    ko: r.querySelector('.v-ko').value.trim(),
    en: r.querySelector('.v-en').value.trim(),
    scene: r.querySelector('.v-scene').value.trim()
  })).filter(v => v.word);

  const collectGram = () => $$('#gramList [data-i]').map(r => ({
    form: r.querySelector('.g-form').value.trim(),
    ko: r.querySelector('.g-ko').value.trim(),
    eg: r.querySelector('.g-eg').value.trim(),
    meaning: r.querySelector('.g-meaning').value.trim()
  })).filter(g => g.form);

  $('#saveApp').addEventListener('click', () => {
    Content.save({
      episode: {
        series: $('#epSeries').value.trim(),
        no: $('#epNo').value.trim(),
        title: $('#epTitle').value.trim(),
        day: $('#epDay').value.trim(),
        nextTitle: $('#epNext').value.trim()
      },
      settings: {
        translateDefault: $('#swTrans').getAttribute('aria-pressed') === 'true',
        hintAuto: $('#swHint').getAttribute('aria-pressed') === 'true',
        cardAutoMs: Math.max(1500, Math.min(12000, +$('#cardMs').value || 4500))
      }
    });
    toast('에피소드·설정을 저장했습니다 — 앱에 바로 반영됩니다');
  });

  $('#saveLearn').addEventListener('click', () => {
    Content.save({ vocab: collectVocab(), grammar: collectGram() });
    loadApp();
    toast('오늘 배운 것을 저장했습니다');
  });

  $('#resetApp').addEventListener('click', () => {
    if (!confirm('앱 콘텐츠를 기본값으로 되돌릴까요?')) return;
    Content.reset();
    loadApp();
    toast('기본값으로 되돌렸습니다');
  });

  /* ---------- 데이터 ---------- */
  $('#expBtn').addEventListener('click', () => {
    const data = Auth.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ep01-admin-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('내려받았습니다');
  });

  $('#copyBtn').addEventListener('click', async () => {
    const txt = JSON.stringify(Auth.exportAll(), null, 2);
    try { await navigator.clipboard.writeText(txt); toast('클립보드에 복사했습니다'); }
    catch (e) { $('#impBox').value = txt; toast('클립보드를 쓸 수 없어 아래 칸에 넣었습니다'); }
  });

  $('#impBtn').addEventListener('click', () => {
    let obj = null;
    try { obj = JSON.parse($('#impBox').value); } catch (e) { toast('JSON 을 읽을 수 없습니다'); return; }
    Auth.importAll(obj);
    selected = null;
    renderStats(); renderUsers(); renderDetail(); loadApp();
    toast('가져왔습니다');
  });

  $('#wipeBtn').addEventListener('click', () => {
    if (!confirm('이 브라우저의 유저를 모두 삭제할까요? 되돌릴 수 없습니다.')) return;
    Object.keys(Auth.users()).forEach(id => Auth.remove(id));
    selected = null;
    renderStats(); renderUsers(); renderDetail();
    toast('전체 삭제했습니다');
  });

  /* ---------- 부팅 ---------- */
  renderStats();
  renderUsers();
  renderDetail();
  loadApp();
  $('#modePill').textContent = '프로토타입 데이터 · 이 브라우저';
})();
