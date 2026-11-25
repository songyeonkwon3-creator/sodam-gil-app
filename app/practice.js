/* ==========================================================================
   practice.js — 복습하기 (단어 퀴즈 · 따라 말하기 · 대화 연습)

   보상 화면과 「오늘 배운 것」에서 연다. 주소 끝에 #practice 를 붙이면 바로 열린다.
   콘텐츠 : EP.Content.data.vocab · .practice (content.js / 관리자 페이지)
   · 듣기  : 브라우저 한국어 음성(speechSynthesis)
   · 말하기 : 브라우저 음성 인식(SpeechRecognition, ko-KR).
             지원하지 않는 브라우저는 녹음해서 내 목소리와 견주어 듣는 방식으로 바뀐다.
   · 기록  : 틀린 단어와 최고 점수를 이 브라우저(localStorage)에 남긴다.
   ========================================================================== */
window.EP = window.EP || {};

(function () {
  const SAVE = 'ep01.practice.v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(SAVE) || '{}'); } catch (e) { return {}; } };
  const store = load();
  store.miss = store.miss || {};    /* 단어 → 틀린 횟수 (맞히면 줄어든다) */
  store.best = store.best || {};    /* 문장 → 최고 발음 점수 */
  store.dlg = store.dlg || {};      /* 대화 id → 가장 좋은 등급 */
  const persist = () => { try { localStorage.setItem(SAVE, JSON.stringify(store)); } catch (e) {} };

  const C = () => (window.EP.Content ? EP.Content.data : EP.CONTENT_DEFAULT);
  const nameOf = () => {
    const s = (window.EP.App && EP.App.s) || {};
    return (s.player_name && String(s.player_name).trim()) || '손님';
  };
  const fill = t => String(t || '').replace(/\[이름\]/g, nameOf());
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sfx = n => { try { if (window.EP.Audio) EP.Audio.sfx(n); } catch (e) {} };

  /* ---------------- 듣기 (TTS) ---------------- */
  /* 단어의 실제 발음 (예: 신다 → [신따]). 음성은 이 발음대로 읽는다. */
  const pronOf = text => {
    const v = (C().vocab || []).find(x => x.word === text);
    return v && v.pron ? v.pron.replace(/[\[\]]/g, '') : text;
  };
  function say(text, who, slow) {
    const isWord = (C().vocab || []).some(x => x.word === text);
    text = pronOf(text);
    const tts = () => {
      if (!('speechSynthesis' in window)) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(fill(text).replace(/[“”‘’]/g, ''));
        u.lang = 'ko-KR';
        const v = speechSynthesis.getVoices().find(x => /^ko/i.test(x.lang));
        if (v) u.voice = v;
        u.rate = slow ? 0.7 : (who === 'SUN' ? 0.88 : 0.95);
        u.pitch = who === 'SUN' ? 0.86 : 1;
        speechSynthesis.speak(u);
      } catch (e) {}
    };
    if (window.EP.Voice && EP.Voice.play(fill(text), who || (isWord ? 'WORD' : ''), { rate: slow ? 0.75 : 0, fallback: tts })) return;
    tts();
  }

  /* ---------------- 말하기 (음성 인식) ---------------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canSR = !!SR;
  const canRec = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  function listen() {
    return new Promise((resolve, reject) => {
      if (!canSR) return reject(new Error('unsupported'));
      const r = new SR();
      r.lang = 'ko-KR'; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
      let done = false;
      const end = (fn, v) => { if (!done) { done = true; clearTimeout(t); fn(v); } };
      const t = setTimeout(() => { try { r.stop(); } catch (e) {} end(resolve, []); }, 8000);
      r.onresult = e => {
        const alts = [];
        const res = e.results[0];
        for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
        end(resolve, alts);
      };
      r.onerror = e => end(reject, new Error(e.error || 'error'));
      r.onend = () => end(resolve, []);
      try { if (window.EP.Voice) EP.Voice.stop(); else speechSynthesis.cancel(); } catch (e) {}
      r.start();
      listen.stop = () => { try { r.stop(); } catch (e) {} };
    });
  }

  /* 녹음 (음성 인식이 없는 브라우저용) */
  async function record(ms) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    const stopped = new Promise(r => { rec.onstop = r; });
    rec.start();
    record.stop = () => { if (rec.state !== 'inactive') rec.stop(); };
    setTimeout(record.stop, ms || 5000);
    await stopped;
    stream.getTracks().forEach(t => t.stop());
    return URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
  }

  /* ---------------- 점수 ----------------
     문장을 자모 단위로 풀어 편집 거리로 견준다 → 받침 하나 틀린 것은 조금만 깎인다. */
  const norm = s => fill(s).replace(/[^가-힣a-zA-Z0-9]/g, '');
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ', JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
  function jamo(s) {
    let out = '';
    for (const ch of s) {
      const c = ch.charCodeAt(0) - 0xAC00;
      if (c >= 0 && c < 11172) { out += CHO[Math.floor(c / 588)] + JUNG[Math.floor((c % 588) / 28)] + (c % 28 ? JONG[c % 28] : ''); }
      else out += ch.toLowerCase();
    }
    return out;
  }
  function lev(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function score(target, said) {
    const a = jamo(norm(target)), b = jamo(norm(said));
    if (!a.length) return 0;
    return Math.max(0, Math.round(100 * (1 - lev(a, b) / Math.max(a.length, b.length))));
  }
  const best = (target, alts) => alts.reduce((m, s) => { const v = score(target, s); return v > m.v ? { v, s } : m; }, { v: 0, s: alts[0] || '' });

  /* 목표 문장에서 들린 글자/안 들린 글자 표시 (음절 LCS) */
  function marks(target, said) {
    const t = [...fill(target)], s = [...norm(said)];
    const tk = t.map((ch, i) => /[가-힣a-zA-Z0-9]/.test(ch) ? i : -1).filter(i => i >= 0);
    const a = tk.map(i => t[i]);
    const dp = Array.from({ length: a.length + 1 }, () => new Array(s.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = s.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === s[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const hit = new Set();
    for (let i = 0, j = 0; i < a.length && j < s.length;) {
      if (a[i] === s[j]) { hit.add(tk[i]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
    }
    return t.map((ch, i) => tk.includes(i) ? `<span class="${hit.has(i) ? 'ok' : 'miss'}">${esc(ch)}</span>` : esc(ch)).join('');
  }
  const verdict = v => v >= 90 ? ['great', '아주 좋아요!', 'Excellent!'] : v >= 65 ? ['near', '거의 다 왔어요.', 'Almost there.'] : ['retry', '한 번 더 들어 볼까요?', 'Listen once more?'];

  /* ---------------- 시트 ---------------- */
  let host = null, tab = 'quiz';
  function open(which) {
    const ov = document.getElementById('ov');
    if (!ov) return;
    tab = which || tab;
    ov.hidden = false; ov.className = 'ov';
    ov.innerHTML = `
      <div class="sheet pr-sheet" role="dialog" aria-label="복습하기">
        <div class="sheet-head">
          <h2>복습하기</h2>
          <span class="sheet-sub">${esc((C().episode || {}).no || 'EP.01')} · ${esc((C().episode || {}).day || 'DAY 1')}</span>
          <button class="x" data-close type="button" aria-label="닫기">✕</button>
        </div>
        <div class="pr-tabs" role="tablist">
          <button type="button" data-tab="quiz">단어 퀴즈</button>
          <button type="button" data-tab="speak">따라 말하기</button>
          <button type="button" data-tab="dialog">대화 연습</button>
        </div>
        <div class="pr-body"></div>
      </div>`;
    host = ov.querySelector('.pr-body');
    ov.querySelector('[data-close]').addEventListener('click', close);
    ov.onclick = e => { if (e.target === ov) close(); };
    ov.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
    show(tab);
  }
  function close() {
    try { if (window.EP.Voice) EP.Voice.stop(); else speechSynthesis.cancel(); } catch (e) {}
    if (listen.stop) listen.stop();
    if (record.stop) record.stop();
    const ov = document.getElementById('ov');
    ov.hidden = true; ov.innerHTML = ''; ov.onclick = null;
  }
  function show(t) {
    tab = t;
    try { if (window.EP.Voice) EP.Voice.stop(); else speechSynthesis.cancel(); } catch (e) {}
    document.querySelectorAll('.pr-tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    ({ quiz: quizStart, speak: speakList, dialog: dialogList })[t]();
    host.scrollTop = 0;
  }

  /* ================= 1. 단어 퀴즈 ================= */
  let Q = null;
  function quizStart(onlyMissed) {
    const vocab = (C().vocab || []).filter(v => v.word);
    if (vocab.length < 2) { host.innerHTML = '<p class="pr-empty">단어가 아직 없어요.</p>'; return; }
    const missed = vocab.filter(v => store.miss[v.word] > 0);
    const pool = onlyMissed && missed.length ? missed : vocab;
    const kinds = shuffle(['listen', 'ko2en', 'en2ko']);
    /* 단어마다 한 번씩 무작위 순서로 내되, 틀린 적 있는 단어를 앞에 둔다.
       8문제를 채울 때는 이미 낸 단어를 다른 유형으로 다시 낸다 (같은 문제가 두 번 나오지 않게). */
    const hard = shuffle(pool.filter(v => store.miss[v.word] > 0));
    const order = hard.concat(shuffle(pool.filter(v => !(store.miss[v.word] > 0))));
    const qs = order.map((v, i) => ({ v, kind: kinds[i % 3] }));
    const extra = shuffle(hard.length ? hard.concat(order) : order);
    for (let i = 0; qs.length < Math.min(8, pool.length * 2) && i < extra.length; i++) {
      const v = extra[i];
      if (qs.filter(q => q.v.word === v.word).length > 1) continue;
      const used = qs.filter(q => q.v.word === v.word).map(q => q.kind);
      qs.push({ v, kind: kinds.find(k => !used.includes(k)) });
    }
    /* 같은 단어가 연달아 나오지 않게 뒤쪽 문제를 섞는다 */
    const head = qs.slice(0, order.length), tail = shuffle(qs.slice(order.length));
    if (tail.length && head.length && tail[0].v.word === head[head.length - 1].v.word) tail.push(tail.shift());
    Q = { qs: head.concat(tail).slice(0, 8), i: 0, right: 0, vocab, wrong: [] };
    quizAsk();
  }
  function quizAsk() {
    const q = Q.qs[Q.i], v = q.v;
    const others = shuffle(Q.vocab.filter(x => x.word !== v.word)).slice(0, 3);
    const opts = shuffle([v, ...others]);
    const label = { listen: '듣고 뜻을 고르세요', ko2en: '뜻을 고르세요', en2ko: '알맞은 한국어를 고르세요' }[q.kind];
    const prompt = q.kind === 'listen'
      ? `<button class="pr-big-play" type="button" data-play aria-label="다시 듣기">▶ 다시 듣기</button>`
      : q.kind === 'ko2en'
        ? `<div class="pr-word">${esc(v.word)}<small>${v.pron ? esc(v.pron) + ' · ' : ''}${esc(v.roman || '')}</small></div>`
        : `<div class="pr-word pr-en">${esc(v.en)}</div>`;
    host.innerHTML = `
      <div class="pr-prog"><i style="width:${(Q.i / Q.qs.length) * 100}%"></i></div>
      <p class="pr-k">${Q.i + 1} / ${Q.qs.length} · ${label}</p>
      <div class="pr-q">${prompt}</div>
      <div class="pr-opts">${opts.map((o, i) => `<button type="button" class="pr-opt" data-i="${i}">${
        q.kind === 'en2ko' ? `${esc(o.word)}` : `${esc(o.en)}`}</button>`).join('')}</div>
      <div class="pr-fb" hidden></div>`;
    const play = () => say(v.word);
    if (q.kind === 'listen') { host.querySelector('[data-play]').addEventListener('click', play); setTimeout(play, 250); }
    host.querySelectorAll('.pr-opt').forEach(b => b.addEventListener('click', () => {
      if (host.querySelector('.pr-opt.right')) return;
      const pick = opts[+b.dataset.i], ok = pick.word === v.word;
      host.querySelectorAll('.pr-opt').forEach((x, i) => { if (opts[i].word === v.word) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      if (ok) { Q.right++; if (store.miss[v.word]) store.miss[v.word]--; }
      else { store.miss[v.word] = (store.miss[v.word] || 0) + 1; Q.wrong.push(v); }
      persist();
      sfx(ok ? 'card' : 'page');
      say(v.word);
      const fb = host.querySelector('.pr-fb');
      fb.hidden = false;
      fb.className = 'pr-fb ' + (ok ? 'good' : 'bad');
      fb.innerHTML = `<b>${ok ? '맞았어요!' : '아쉬워요.'}</b>
        <span class="pr-fb-w">${esc(v.word)} <em>${v.pron ? esc(v.pron) + ' ' : ''}${esc(v.roman || '')}</em> = ${esc(v.en)}</span>
        <button type="button" class="btn primary pr-next">${Q.i + 1 < Q.qs.length ? '다음' : '결과 보기'}</button>`;
      fb.querySelector('.pr-next').addEventListener('click', () => { Q.i++; Q.i < Q.qs.length ? quizAsk() : quizDone(); });
    }));
  }
  function quizDone() {
    const n = Q.qs.length, r = Q.right;
    const wrong = [...new Map(Q.wrong.map(v => [v.word, v])).values()];
    host.innerHTML = `
      <div class="pr-result">
        <p class="pr-k">단어 퀴즈 결과</p>
        <div class="pr-score">${r}<small> / ${n}</small></div>
        <p>${r === n ? '모두 맞혔어요. 오늘 단어는 완벽해요!' : r >= n * 0.6 ? '잘했어요. 틀린 단어만 한 번 더 볼까요?' : '괜찮아요. 다시 만나면 금방 익숙해져요.'}</p>
        ${wrong.length ? `<ul class="pr-wrong">${wrong.map(v => `<li><button type="button" data-say="${esc(v.word)}">▶</button><b>${esc(v.word)}</b> ${esc(v.en)}</li>`).join('')}</ul>` : ''}
        <div class="btn-row">
          ${wrong.length ? '<button type="button" class="btn primary" data-missed>틀린 단어 다시</button>' : ''}
          <button type="button" class="btn ${wrong.length ? '' : 'primary'}" data-again>처음부터</button>
          <button type="button" class="btn" data-go="speak">따라 말하기 →</button>
        </div>
      </div>`;
    host.querySelectorAll('[data-say]').forEach(b => b.addEventListener('click', () => say(b.dataset.say)));
    const m = host.querySelector('[data-missed]'); if (m) m.addEventListener('click', () => quizStart(true));
    host.querySelector('[data-again]').addEventListener('click', () => quizStart(false));
    host.querySelector('[data-go]').addEventListener('click', () => show('speak'));
  }

  /* ================= 2. 따라 말하기 ================= */
  function speakItems() {
    const words = (C().vocab || []).map(v => ({ ko: v.word, en: v.en, roman: (v.pron ? v.pron + ' · ' : '') + (v.roman || ''), kind: 'word' }));
    const lines = ((C().practice || {}).speak || []).map(s => Object.assign({ kind: 'line' }, s));
    return lines.concat(words);
  }
  function srNote() {
    if (canSR) return '마이크를 누르고 문장을 말해 보세요. 들린 글자는 초록, 안 들린 글자는 분홍으로 표시돼요.';
    if (canRec) return '이 브라우저는 음성 인식을 지원하지 않아요. 녹음해서 원어민 음성과 내 목소리를 견주어 들어 보세요. (Chrome·Safari에서는 점수까지 볼 수 있어요.)';
    return '이 브라우저에서는 마이크를 쓸 수 없어요. 듣고 소리 내어 따라 해 보세요.';
  }
  function speakList() {
    const items = speakItems();
    host.innerHTML = `
      <p class="pr-lede">${srNote()}</p>
      <ul class="pr-slist">${items.map((it, i) => `
        <li class="pr-sitem ${it.kind}" data-i="${i}">
          <div class="pr-st">
            <div class="pr-sko">${esc(fill(it.ko))}${it.roman ? `<small>${esc(it.roman)}</small>` : ''}</div>
            <div class="pr-sen">${esc(fill(it.en))}</div>
          </div>
          <div class="pr-sbtns">
            <button type="button" class="pr-ic" data-play title="듣기" aria-label="듣기">▶</button>
            <button type="button" class="pr-ic slow" data-slow title="천천히 듣기" aria-label="천천히 듣기">½</button>
            <button type="button" class="pr-ic mic" data-mic title="말하기" aria-label="말하기" ${canSR || canRec ? '' : 'disabled'}>●</button>
          </div>
          <div class="pr-sres" ${store.best[it.ko] != null ? '' : 'hidden'}>${store.best[it.ko] != null ? `<span class="pr-badge">최고 ${store.best[it.ko]}점</span>` : ''}</div>
        </li>`).join('')}</ul>`;
    host.querySelectorAll('.pr-sitem').forEach(li => {
      const it = items[+li.dataset.i];
      li.querySelector('[data-play]').addEventListener('click', () => say(it.ko));
      li.querySelector('[data-slow]').addEventListener('click', () => say(it.ko, null, true));
      li.querySelector('[data-mic]').addEventListener('click', e => speakTry(li, it, e.currentTarget));
    });
  }
  async function speakTry(li, it, btn) {
    const res = li.querySelector('.pr-sres');
    if (btn.classList.contains('rec')) { if (listen.stop) listen.stop(); if (record.stop) record.stop(); return; }
    host.querySelectorAll('.pr-ic.mic.rec').forEach(b => b.classList.remove('rec'));
    btn.classList.add('rec');
    res.hidden = false;
    res.innerHTML = `<span class="pr-listening">듣고 있어요… 말해 보세요</span>`;
    if (canSR) {
      try {
        const alts = await listen();
        btn.classList.remove('rec');
        if (!alts.length) { res.innerHTML = '<span class="pr-listening">소리가 들리지 않았어요. 다시 눌러 말해 보세요.</span>'; return; }
        const b = best(it.ko, alts);
        const [cls, ko, en] = verdict(b.v);
        if (store.best[it.ko] == null || b.v > store.best[it.ko]) { store.best[it.ko] = b.v; persist(); }
        res.innerHTML = `
          <div class="pr-verdict ${cls}"><b>${b.v}</b><span>${ko}<small>${en}</small></span></div>
          <div class="pr-marks">${marks(it.ko, b.s)}</div>
          <div class="pr-heard">들린 말 : ${esc(b.s)}</div>`;
        sfx(b.v >= 90 ? 'card' : 'page');
      } catch (e) {
        btn.classList.remove('rec');
        res.innerHTML = `<span class="pr-listening">${/not-allowed|service-not-allowed/.test(e.message) ? '마이크 사용을 허용해 주세요.' : '음성 인식을 쓸 수 없어요. 잠시 뒤 다시 해 보세요.'}</span>`;
      }
      return;
    }
    try {
      const url = await record(4500);
      btn.classList.remove('rec');
      res.innerHTML = `<div class="pr-cmp"><button type="button" class="btn" data-native>▶ 원어민</button><button type="button" class="btn primary" data-mine>▶ 내 목소리</button></div>`;
      res.querySelector('[data-native]').addEventListener('click', () => say(it.ko));
      res.querySelector('[data-mine]').addEventListener('click', () => new Audio(url).play());
    } catch (e) {
      btn.classList.remove('rec');
      res.innerHTML = '<span class="pr-listening">마이크 사용을 허용해 주세요.</span>';
    }
  }

  /* ================= 3. 대화 연습 ================= */
  const GRADE = { best: ['great', '아주 자연스러워요'], good: ['near', '좋아요'], casual: ['retry', '말투를 바꿔 볼까요?'], mismatch: ['retry', '질문에 맞는 답을 골라 볼까요?'] };
  function dialogList() {
    const ds = (C().practice || {}).dialog || [];
    host.innerHTML = `
      <p class="pr-lede">순자의 말을 듣고 대답해 보세요. 말해서 대답하거나, 아래 보기에서 골라도 돼요.</p>
      <ul class="pr-dlist">${ds.map((d, i) => `
        <li><button type="button" data-i="${i}">
          <span class="pr-dn">${esc(d.scene)}</span>
          <span class="pr-dt">${esc(d.title)}<small>${esc(d.sun)}</small></span>
          ${store.dlg[d.id] ? `<span class="pr-badge ${GRADE[store.dlg[d.id]][0]}">${GRADE[store.dlg[d.id]][1]}</span>` : ''}
        </button></li>`).join('')}</ul>`;
    host.querySelectorAll('.pr-dlist [data-i]').forEach(b => b.addEventListener('click', () => dialogRun(+b.dataset.i)));
  }
  function dialogRun(i) {
    const ds = (C().practice || {}).dialog || [];
    const d = ds[i];
    if (!d) return dialogList();
    const fig = ((window.EP.FIG_SRC || {}).sunja || {})[d.exp || 'default'] || ((window.EP.FIG_SRC || {}).sunja || {}).default || '';
    host.innerHTML = `
      <p class="pr-k">${i + 1} / ${ds.length} · ${esc(d.title)}</p>
      <div class="pr-scene">
        ${fig ? `<img class="pr-fig" src="${esc(fig)}" alt="">` : ''}
        <div class="pr-bubble"><b>순자</b>${esc(d.sun)}<small>${esc(d.sunEn || '')}</small>
          <button type="button" class="pr-ic" data-play aria-label="다시 듣기">▶</button></div>
      </div>
      <div class="pr-answer">
        ${canSR ? '<button type="button" class="pr-mic-big" data-mic>● 말해서 대답하기</button>' : ''}
        <p class="pr-k">${canSR ? '또는 골라서 대답하기' : '대답을 골라 보세요'}</p>
        <div class="pr-opts">${shuffle(d.answers.map((a, k) => k)).map(k => `<button type="button" class="pr-opt" data-k="${k}">${esc(fill(d.answers[k].ko))}</button>`).join('')}</div>
      </div>
      <div class="pr-fb" hidden></div>`;
    const play = () => say(d.sun, 'SUN');
    host.querySelector('[data-play]').addEventListener('click', play);
    setTimeout(play, 300);
    host.querySelectorAll('.pr-answer .pr-opt').forEach(b => b.addEventListener('click', () => { say(fill(d.answers[+b.dataset.k].ko)); dialogFeedback(d, i, +b.dataset.k, null); }));
    const mic = host.querySelector('[data-mic]');
    if (mic) mic.addEventListener('click', async () => {
      if (mic.classList.contains('rec')) { if (listen.stop) listen.stop(); return; }
      mic.classList.add('rec'); mic.textContent = '듣고 있어요… (누르면 멈춤)';
      try {
        const alts = await listen();
        mic.classList.remove('rec'); mic.textContent = '● 말해서 대답하기';
        if (!alts.length) { mic.textContent = '● 들리지 않았어요. 다시 말하기'; return; }
        /* 가장 가까운 대답을 찾는다 */
        let pick = { k: 0, v: -1, s: alts[0] };
        d.answers.forEach((a, k) => alts.forEach(s => { const v = score(a.ko, s); if (v > pick.v) pick = { k, v, s }; }));
        dialogFeedback(d, i, pick.v >= 45 ? pick.k : -1, pick);
      } catch (e) {
        mic.classList.remove('rec'); mic.textContent = '● 말해서 대답하기';
      }
    });
  }
  function dialogFeedback(d, i, k, heard) {
    const ds = (C().practice || {}).dialog || [];
    const fb = host.querySelector('.pr-fb');
    const model = d.answers.find(a => a.grade === 'best') || d.answers[0];
    host.querySelectorAll('.pr-answer .pr-opt').forEach(b => b.classList.toggle('picked', +b.dataset.k === k));
    fb.hidden = false;
    if (k < 0) {
      fb.className = 'pr-fb bad';
      fb.innerHTML = `<b>조금 다르게 들렸어요.</b>
        <span>들린 말 : ${esc(heard.s)}</span>
        <span class="pr-model">이렇게 말해 보세요 : <button type="button" class="pr-ic" data-say>▶</button> ${esc(fill(model.ko))}</span>
        <div class="btn-row"><button type="button" class="btn primary" data-retry>다시 해 보기</button></div>`;
    } else {
      const a = d.answers[k];
      const [cls, label] = GRADE[a.grade] || GRADE.good;
      const rank = { best: 3, good: 2, casual: 1, mismatch: 1 };
      const retry = a.grade === 'casual' || a.grade === 'mismatch';
      if (!store.dlg[d.id] || rank[a.grade] > rank[store.dlg[d.id]]) { store.dlg[d.id] = a.grade; persist(); }
      fb.className = 'pr-fb ' + (retry ? 'bad' : 'good');
      fb.innerHTML = `<b class="pr-grade ${cls}">${label}</b>
        ${heard ? `<span class="pr-heard">들린 말 : ${esc(heard.s)}${heard.v != null ? ` · 발음 ${heard.v}점` : ''}</span>` : ''}
        <span>${esc(fill(a.fb))}<small>${esc(fill(a.fbEn || ''))}</small></span>
        ${a.grade !== 'best' ? `<span class="pr-model">더 자연스러운 말 : <button type="button" class="pr-ic" data-say>▶</button> ${esc(fill(model.ko))}</span>` : ''}
        <div class="btn-row">
          <button type="button" class="btn" data-retry>다시 해 보기</button>
          <button type="button" class="btn primary" data-next>${i + 1 < ds.length ? '다음 대화' : '목록으로'}</button>
        </div>`;
      sfx(retry ? 'page' : 'card');
    }
    const sb = fb.querySelector('[data-say]'); if (sb) sb.addEventListener('click', () => say(fill(model.ko)));
    fb.querySelector('[data-retry]').addEventListener('click', () => dialogRun(i));
    const nx = fb.querySelector('[data-next]'); if (nx) nx.addEventListener('click', () => i + 1 < ds.length ? dialogRun(i + 1) : dialogList());
    fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  EP.Practice = { open, close, score, canSR, canRec };

  /* 시연용 : 주소 끝 #practice (또는 #practice-speak / #practice-dialog) 로 바로 열기 */
  function fromHash() {
    const m = /^#practice(?:-(quiz|speak|dialog))?$/.exec(location.hash);
    if (m) setTimeout(() => open(m[1] || 'quiz'), 400);
  }
  window.addEventListener('hashchange', fromHash);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fromHash); else fromHash();
})();
