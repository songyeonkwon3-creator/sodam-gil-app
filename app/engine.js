/* ==========================================================================
   engine.js — 상태 스토어 · 비트 러너 · HUD · 오버레이 · 보상
   구조: 분기 후 재합류(Branch and Merge). 커서는 항상 앞으로만 간다.
   학습 스토어(L_KEY)는 스토리 스토어(S_KEY)와 물리적으로 분리되어 있고,
   스토리 렌더 경로에서 학습 값을 읽지 않는다.
   ========================================================================== */
window.EP = window.EP || {};

(function () {
  /* 저장 키는 지금 플레이 중인 유저에게서 매번 계산한다.
     (모듈 로드 시점에 고정하면, 공유 링크로 처음 들어온 사람이 계정을 만든 뒤에도
      'local' 키에 저장돼 계정별 분 리가 깨진다) */
  const uidNow = () => (window.EP.Auth && EP.Auth.uid()) || 'local';
  const S_KEY = () => 'ep01.story.v1.' + uidNow();
  const L_KEY = () => 'ep01.learning.v1.' + uidNow();
  const POS_KEY = () => 'ep01.pos.' + uidNow();

  /* ---------------- 스토리 스토어 (관계·진행) ---------------- */
  const DEFAULT_STORY = {
    player_name: '',
    motivation: null,
    met_hodu: false,
    sunja_first_impression: null,
    room_key: false,
    inspected_window: false,
    inspected_bed: false,
    box_found: false,
    photo_clues: [],
    photo_response: null,
    reply: null,
    day1_completed: false
  };

  /* ---------------- 학습 스토어 (내부 기록 전용) ----------------
     이 객체의 값은 대사·관계·엔딩·연출 어디에도 쓰이지 않는다.
     UI 에는 개발용 상태 패널에서만 노출된다.                        */
  const DEFAULT_LEARN = {
    shoe_first_try_correct: null,
    shoe_hint_level: 0,
    attempts: {},
    hint_unlocks: {}
  };

  const load = (k, d) => {
    try { const raw = localStorage.getItem(k); if (!raw) return structuredClone(d); return Object.assign(structuredClone(d), JSON.parse(raw)); }
    catch (e) { return structuredClone(d); }
  };

  const App = window.EP.App = {
    s: load(S_KEY(), DEFAULT_STORY),    /* story */
    l: load(L_KEY(), DEFAULT_LEARN),    /* learning */
    english: false,
    flow: [],
    cursor: 0,
    sceneIdx: -1,
    busy: false,
    consumed: {},     /* 반복 선택지 처리 */
    waitTap: null,
    gen: 0            /* 실행 세대 — 장면 점프 시 이전 루프 무효화 */
  };

  const $ = id => document.getElementById(id);
  const el = {
    dlg: $('dlg'), name: $('dlgName'), text: $('dlgText'), en: $('dlgEn'),
    choice: $('choice'), chList: $('chList'), chTitle: $('chTitle'), chId: $('chId'), chType: $('chType'),
    art: $('art'), prog: $('prog'), hud: $('hud'), ov: $('ov'), ui: $('stageui')
  };

  /* ---------------- 저장 ---------------- */
  App.persist = () => {
    try { localStorage.setItem(S_KEY(), JSON.stringify(App.s)); } catch (e) {}
    if (window.EP.Auth) EP.Auth.sync({ story: App.s, learning: App.l });
  };
  function persistLearn() {
    try { localStorage.setItem(L_KEY(), JSON.stringify(App.l)); } catch (e) {}
    if (window.EP.Auth) EP.Auth.sync({ story: App.s, learning: App.l });
  }

  App.story = patch => { Object.assign(App.s, patch); App.persist(); };
  /* 사운드 큐 → 합성 효과음. 소리 끔 상태면 아무 것도 하지 않는다. */
  App.soundOn = true;
  App.sound = cue => {
    if (!cue || App.soundOn === false || !window.EP.Audio) return;
    const map = {
      foot: 'footsteps', footsteps: 'footsteps', bell: 'bell', cat: 'cat', gate: 'gate',
      box: 'box', knock: 'knock', notify: 'notify',
      window: 'page', 'photo-clue': 'card', cue: 'card', shower: 'rain'
    };
    EP.Audio.sfx(map[cue] || cue);
  };

  /* ---------------- 흐름 평탄화 ---------------- */
  function flatten() {
    const out = [];
    EP.SCENES.forEach((sc, si) => {
      sc.beats.forEach((b, bi) => out.push(Object.assign({}, b, { scene: si, bi })));
    });
    return out;
  }

  /* ---------------- 이름 ---------------- */
  const nameOf = () => (App.s.player_name && App.s.player_name.trim()) || '손님';
  const fill = t => String(t || '').replace(/\[이름\]/g, nameOf());

  /* ---------------- 장면 ---------------- */
  function enterScene(si) {
    if (si === App.sceneIdx) return;
    App.sceneIdx = si;
    /* 관리자 설정 — 장면 진입 시 1단계 힌트 자동 열기 (장면당 1회) */
    if (App.hintAuto && !App.hintAutoSeen) App.hintAutoSeen = {};
    if (App.hintAuto) {
      const sc = EP.SCENES[si];
      if (sc && !App.hintAutoSeen[sc.id]) {
        App.hintAutoSeen[sc.id] = true;
        setTimeout(() => { try { openHint(sc.id, 1); } catch (e) {} }, 900);
      }
    }
    const sc = EP.SCENES[si];
    /* 이어하기·장면 점프 : 이 장면에서 이미 지나간 배경 변경(bg/clip)을 다시 적용 */
    let artKey = sc.art;
    for (let k = 0; k < App.cursor && k < App.flow.length; k++) {
      const f = App.flow[k];
      if (f.scene !== si) continue;
      if (f.t === 'bg') artKey = f.art;
      else if (f.t === 'clip' && f.bg) artKey = f.bg;
    }
    EP.Art.show(artKey);
    if (EP.Art.reset) EP.Art.reset(artKey);
    if (window.EP.Audio) EP.Audio.scene(sc.art, sc.id);
    App.interactActive = false;
    refreshHintState();
    /* 장면 진입 : 무대 초기화 후 해당 장면이 비트로 다시 세운다.
       이전 장면의 조사 카드가 남아 있으면 강제로 닫는다. */
    if (EP.Interact.closeAllCards) EP.Interact.closeAllCards();
    document.getElementById('noteLayer').innerHTML = '';
    EP.Art.clearProps();
    EP.Art.clearFigs();
    el.ui.innerHTML = '';
    el.dlg.hidden = true;
    el.choice.hidden = true;
    const gate = document.querySelector('.set-gate .gd');
    if (gate) gate.classList.remove('open');
    const warm = document.querySelector('.set-gate .warmth');
    if (warm) warm.classList.remove('on');
    const door = document.querySelector('.set-door .frame');
    if (door) { door.classList.remove('open'); door.querySelector('.leaf').classList.remove('open'); }
    const card = document.getElementById('photoCard');
    if (card) card.classList.remove('flip');
    /* S07 : 이전 장면의 핫스팟 레이어와 안내 문구 초기화 */
    document.querySelectorAll('.set-photo .pin-layer, .set-photo .pin-legend').forEach(n => n.remove());
    const ph = document.getElementById('photoHint');
    if (ph) { ph.textContent = '사진을 눌러 뒤집어 보기'; ph.style.opacity = ''; }
    savePos();
  }

  function savePos() {
    try { localStorage.setItem(POS_KEY(), JSON.stringify({ cursor: App.cursor, scene: App.sceneIdx, at: Date.now() })); } catch (e) {}
    if (window.EP.Auth) EP.Auth.sync({ progress: { cursor: App.cursor, scene: App.sceneIdx, updatedAt: Date.now() } });
  }

  /* ---------------- FX ---------------- */
  function fx(name, off) {
    const gate = document.querySelector('.set-gate .gd');
    const warm = document.querySelector('.set-gate .warmth');
    const frame = document.querySelector('.set-door .frame');
    if (name === 'gateOpen' && gate) {
      gate.classList.add('open'); if (warm) warm.classList.add('on'); App.sound('gate');
    }
    if (name === 'gateClose' && gate) {
      gate.classList.remove('open'); if (warm) warm.classList.remove('on');
    }
    if (name === 'doorOpen' && frame) {
      frame.classList.toggle('open', !off);
      frame.querySelector('.leaf').classList.toggle('open', !off);
    }
  }

  /* ---------------- 대사 ---------------- */
  function showLine(b) {
    const who = (EP.WHO[b.who] || EP.WHO.NAR);
    el.dlg.hidden = false;
    el.choice.hidden = true;
    el.dlg.dataset.who = who.cls;
    const label = b.who === 'PC' ? nameOf() : who.label;
    el.name.textContent = label;
    el.name.classList.toggle('on', !!label);
    el.text.innerHTML = fill(b.ko);
    el.en.innerHTML = b.en ? fill(b.en) : '';
    el.en.classList.toggle('on', !!(b.en && App.english));
    const tip = el.dlg.querySelector('.tip');
    if (tip) tip.textContent = b.who === 'SFX' ? '' : (b.core ? '핵심 표현 · 번역은 우측 상단' : '탭하여 계속');
    /* 카드 재등장 애니메이션 */
    const card = el.dlg.querySelector('.dlg-in');
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
    /* 음성 : 화면에 보이는 문장을 읽는다 */
    if (window.EP.Audio && App.soundOn !== false) EP.Audio.voice(fill(b.ko), b.who);
    return new Promise(res => { App.waitTap = res; });
  }

  function advance() {
    if (!App.waitTap) return;
    const r = App.waitTap; App.waitTap = null; r();
  }

  /* ---------------- 선택지 ---------------- */
  function showChoice(b) {
    el.dlg.hidden = true;
    el.choice.hidden = false;
    if (el.chId) el.chId.textContent = '';
    el.chTitle.textContent = b.title || '';
    el.chType.textContent = b.type;
    el.chType.dataset.t = b.type;
    const doneSet = App.consumed[b.id] || new Set();
    refreshHintState();
    if (window.EP.Audio) EP.Audio.sfx('card');

    el.chList.innerHTML = '';
    return new Promise(resolve => {
      b.opts.forEach((o, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'opt' + (doneSet.has(i) ? ' dim' : '');
        btn.innerHTML = `
          <span class="num">${i + 1}</span>
          <span class="ot">
            <span class="ko">${fill(o.ko)}</span>
            <span class="sub en ${App.english ? 'on' : ''}">${fill(o.en || '')}</span>
            ${o.tag ? `<span class="tag">${o.tag}</span>` : ''}
          </span>`;
        btn.addEventListener('click', async () => {
          if (doneSet.has(i)) return;
          if (b.type === 'LANG') App.l.attempts[b.id] = (App.l.attempts[b.id] || 0) + 1, persistLearn();
          btn.classList.add('picked');
          hideChoice();
          if (o.set) App.story(o.set);
          if (o.clip && EP.Art.clip) await EP.Art.clip(o.clip);
          if (o.cue) App.sound(o.cue);

          if (o.note) await App.note(o.note, o.noteEn);
          if (o.note2) await App.note(o.note2, o.note2En);

          if (o.then === 'repeat') {
            App.consumed[b.id] = doneSet; doneSet.add(i);
            await new Promise(r => setTimeout(r, 120));
            showChoice(b).then(resolve);
            return;
          }
          resolve();
        });
        el.chList.appendChild(btn);
      });
      /* 타입 안내 */
      const hint = document.createElement('div');
      hint.className = 'ch-hint';
      hint.innerHTML = {
        STORY: '정답은 없습니다. 고른 태도가 뒤의 대화에 남습니다.',
        LANG: '상황에 맞는 말을 골라 보세요. 틀려도 이야기는 계속됩니다.',
        ACTION: '하고 싶은 행동을 고르세요.',
        INVESTIGATE: '살펴볼 곳을 고르세요.'
      }[b.type] || '';
      el.chList.appendChild(hint);
    });
  }
  function hideChoice() { el.choice.hidden = true; refreshHintState(); }

  /* 힌트는 '선택지가 떠 있거나 무언가를 조사하는 중'일 때만 연다.
     대사만 읽는 순간에는 무슨 힌트인지 알 수 없으므로 잠근다. */
  App.interactActive = false;
  function refreshHintState() {
    const b = document.getElementById('tHint');
    if (!b) return;
    const choiceOpen = !document.getElementById('choice').hidden;
    const on = choiceOpen || App.interactActive;
    b.disabled = !on;
    b.setAttribute('aria-disabled', String(!on));
    b.classList.toggle('ready', on);
  }
  function setHintEnabled() { refreshHintState(); }

  /* ---------------- 노트(장면 반응 / 학습 피드백) ---------------- */
  App.note = function (ko, en, ms) {
    return EP.Interact.insight({ ko: fill(ko), en: fill(en || ''), ms: ms || 1900, btn: '계속' });
  };

  /* ---------------- 러너 ---------------- */
  async function run() {
    if (App.busy) return;
    App.busy = true;
    const gen = ++App.gen;
    const alive = () => gen === App.gen;
    while (App.cursor < App.flow.length && alive()) {
      const b = App.flow[App.cursor];
      enterScene(b.scene);
      if (b.cond && !b.cond(App.s)) { App.cursor++; savePos(); continue; }

      if (b.t === 'line') {
        el.prog.style.width = ((App.cursor + 1) / App.flow.length) * 100 + '%';
        if (b.cue) App.sound(b.cue);
        if (b.exp && EP.Art.fig('sunja')) EP.Art.fig('sunja', { exp: b.exp });
        await showLine(b);
        if (!alive()) return;
        App.cursor++; savePos();
        continue;
      }

      if (b.t === 'choice') {
        el.prog.style.width = ((App.cursor + 1) / App.flow.length) * 100 + '%';
        await showChoice(b);
        if (!alive()) return;
        App.cursor++; savePos();
        continue;
      }

      if (b.t === 'fig') { EP.Art.fig(b.who, b); App.cursor++; continue; }
      if (b.t === 'prop') { EP.Art.prop(b.name); App.cursor++; continue; }
      if (b.t === 'fx') { fx(b.art, b.off); App.cursor++; continue; }
      if (b.t === 'set') { App.story(b.patch || {}); App.cursor++; continue; }
      if (b.t === 'bg') { EP.Art.show(b.art); App.cursor++; savePos(); continue; }
      if (b.t === 'clip') {
        el.dlg.hidden = true;
        await EP.Art.clip(b.clip);
        if (!alive()) return;
        if (b.bg) EP.Art.show(b.bg);
        App.cursor++; savePos(); continue;
      }
      if (b.t === 'wait') { await new Promise(r => setTimeout(r, b.ms || 600)); App.cursor++; continue; }

      if (b.t === 'interact') {
        el.dlg.hidden = true;
        /* 조사 화면에서도 힌트를 열 수 있어야 한다 (S04·S06·S07) */
        App.interactActive = true;
        refreshHintState();
        await new Promise(done => {
          EP.Interact.run(b.kind, {
            story: patch => App.story(patch),
            note: App.note,
            done: () => { App.interactActive = false; refreshHintState(); done(); },
            openHint: (sc, lvl) => openHint(sc, lvl),
            bumpShoeHint: () => { App.l.shoe_hint_level = Math.min(3, App.l.shoe_hint_level + 1); persistLearn(); updateHintDot(); return App.l.shoe_hint_level; },
            recordShoe: ok => { App.l.shoe_first_try_correct = !!ok; persistLearn(); },
            bumpHint: id => { App.l.attempts[id] = (App.l.attempts[id] || 0) + 1; persistLearn(); }
          });
        });
        if (!alive()) return;
        el.prog.style.width = ((App.cursor + 1) / App.flow.length) * 100 + '%';
        App.cursor++; savePos();
        continue;
      }
      App.cursor++;
    }
    App.gen++;
    App.busy = false;
    finishEpisode();
  }

  /* ---------------- 장면 이동 ---------------- */
  function gotoScene(si, sceneCursor) {
    App.flow = App.flow.length ? App.flow : flatten();
    let idx = App.flow.findIndex(b => b.scene === si);
    if (sceneCursor) idx = App.flow.findIndex(b => b.scene === si && b.bi === sceneCursor);
    if (idx < 0) return;
    App.gen++;                 /* 진행 중인 루프 무효화 */
    App.cursor = idx;
    App.sceneIdx = -1;
    App.consumed = {};
    EP.Art.clearFigs(); EP.Art.clearProps();
    el.ui.innerHTML = '';
    closeOv();
    if (EP.Interact.closeAllCards) EP.Interact.closeAllCards();
    document.getElementById('noteLayer').innerHTML = '';
    document.getElementById('stage').classList.remove('shoes-mode');
    document.getElementById('stage').classList.remove('compose-mode');
    document.querySelectorAll('.endcard, .reward').forEach(n => n.remove());
    const gate = document.querySelector('.set-gate .gd');
    if (gate) { gate.classList.remove('open'); }
    document.querySelectorAll('.set-door .frame').forEach(f => { f.classList.remove('open'); f.querySelector('.leaf').classList.remove('open'); });
    const card = document.getElementById('photoCard');
    if (card) card.classList.remove('flip');
    App.waitTap = null;
    App.busy = false;
    const stage = document.getElementById('stage');
    stage.classList.remove('is-ending');
    document.getElementById('hud').style.display = '';
    run();
  }

  /* ---------------- 오버레이 : 시트 ---------------- */
  function openSheet(inner, center) {
    el.ov.hidden = false;
    el.ov.className = 'ov' + (center ? ' center' : '');
    el.ov.innerHTML = inner;
    el.ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeOv));
    el.ov.addEventListener('click', e => { if (e.target === el.ov && !center) closeOv(); });
    return el.ov;
  }
  function closeOv() { el.ov.hidden = true; el.ov.innerHTML = ''; }

  /* ---------------- 힌트 3단계 ---------------- */
  const HINTS = {
    S01: [{ ko: '이 장면에는 언어 과제가 없습니다.', en: 'No language task in this scene — just get inside the story.', why: '몰입과 자기 투영을 위한 장면입니다.' }],
    S02: [
      { ko: '‘여기’는 내가 서 있는 이곳을 가리키는 말이에요.', en: '‘여기’ means this place — right where you are.', why: '문 앞에서 ‘봄하숙... 여기인가?’ 하고 혼잣말했죠.' },
      { ko: '‘비’ = rain, ‘어디’ = where.', en: '‘비’ is rain. ‘어디’ is where.', why: '하늘에서 빗방울이 떨어지기 시작했어요.' }
    ],
    S03: [
      { ko: '처음 만난 어른에게는 ‘안녕하세요’가 자연스러워요.', en: 'With an elder you have just met, ‘안녕하세요’ is the natural choice.', why: '세 선택 모두 진행됩니다. 표현의 온도만 달라져요.' },
      { ko: '‘감사합니다’는 고마움을 정중하게 전하는 말이에요.', en: '‘감사합니다’ is a polite thank you.', why: '수건을 받은 직후라면 충분히 자연스러운 말이에요.' },
      { ko: '‘안녕! 고마워!’는 친구 사이의 반말이에요.', en: '‘안녕! 고마워!’ is casual speech — for friends.', why: '틀린 문법이 아니라 관계에 따른 차이입니다. 순자가 직접 짚어 줘요.' }
    ],
    S04: [
      { ko: '순자가 “신발은 여기서 벗어요.”라고 했어요.', en: 'Sunja said: “You take your shoes off here.”', why: '1단계 : 상황을 다시 떠올려 보세요.' },
      { ko: '신발 그림을 눌러 보세요.', en: 'Tap the shoes.', why: '2단계 : 순자가 신발 쪽을 가리킵니다.' },
      { ko: '‘신발을 벗어요’ = you take your shoes off. ‘벗다’ = take off (shoes, clothes).', en: '‘신발을 벗어요’ = you take your shoes off. ‘벗다’ = to take off footwear or clothing.', why: '3단계 : 벗은 다음에는 ‘실내화’(indoor slippers)를 신어요.' }
    ],
    S05: [
      { ko: '자기소개는 ‘저는 + 이름 + 입니다’ 순서예요.', en: 'Self-introduction: ‘저는’ + name + ‘입니다’.', why: '이름이 외국어여도 이 문장은 그대로 안전합니다.' },
      { ko: '‘저’는 나를 낮추어 말하는 대명사예요.', en: '‘저’ is the humble form of “I”.', why: '처음 만난 어른에게 쓰는 기본형이에요.' }
    ],
    S06: [
      { ko: '방 안에서 세 곳을 살펴볼 수 있어요. 책상은 꼭 봐야 해요.', en: 'Three things to look at. The desk is the one you need.', why: '창문과 침대는 선택이에요.' }
    ],
    S07: [
      { ko: '단서는 세 개예요. 건물 · 사람들 · 뒷면.', en: 'Three clues: the building, the people, the back of the photo.', why: '뒷면은 사진을 눌러 뒤집은 다음에 볼 수 있어요.' },
      { ko: '‘사진’ = photograph, ‘사람’ = person.', en: '‘사진’ is photograph, ‘사람’ is person.', why: '단서 문장은 평가하지 않아요. 관찰이 목적입니다.' }
    ],
    S08: [
      { ko: '보여줄까, 물어볼까, 감출까. 정답은 없어요.', en: 'Show it, ask about it, or hide it — there is no right answer.', why: '세 선택 모두 다른 DAY 2 대사로 이어집니다.' },
      { ko: '‘여기 사진이 있어요’ = There is a photo here.', en: '‘여기 사진이 있어요’ = There is a photo here.', why: '사진을 건네며 쓰기 좋은 문장이에요.' }
    ],
    S09: [
      { ko: '답장 내용에 따라 DAY 2에서 발신자가 다르게 말을 겁니다.', en: 'What you reply decides how the sender opens DAY 2.', why: '답장하지 않아도 이야기는 이어집니다.' },
      { ko: '‘누구세요?’ = Who are you?', en: '‘누구세요?’ = Who are you?', why: '모르는 번호에 쓰는 가장 무난한 질문이에요.' }
    ]
  };

  function scenarioId() {
    const sc = EP.SCENES[App.sceneIdx];
    return sc ? sc.id : 'S01';
  }

  function openHint(scId, level) {
    const id = scId || scenarioId();
    const list = HINTS[id] || [];
    const unlocked = App.l.hint_unlocks[id] || (level ? level : 1);
    App.l.hint_unlocks[id] = Math.max(unlocked, 1);
    persistLearn();
    renderHint(id);
  }

  function renderHint(id) {
    const list = HINTS[id] || [];
    const un = App.l.hint_unlocks[id] || 1;
    const body = list.map((h, i) => {
      const locked = i + 1 > un;
      return `<div class="hint ${locked ? 'locked' : ''}">
        <div class="h-n">${i + 1}단계 · ${['상황 반응', '작은 힌트', '직접 도움'][i]}</div>
        <div class="h-t">${locked ? '아직 열리지 않았어요.' : h.ko}</div>
        ${!locked && h.en ? `<div class="h-en ${App.english ? 'on' : ''}">${h.en}</div>` : ''}
        ${!locked && h.why ? `<div class="h-why">${h.why}</div>` : ''}
      </div>`;
    }).join('');

    const more = un < list.length
      ? `<button class="btn" id="hintMore" type="button">한 단계 더 알려 주세요</button>`
      : `<button class="btn" id="hintMore" type="button" disabled>힌트를 모두 열었어요</button>`;

    /* 지금 무엇에 대한 힌트인지 — 선택지인지, 조사 중인지 */
    const inChoice = !document.getElementById('choice').hidden;
    const ctxLabel = inChoice ? '선택지' : '지금 화면';
    const ctxLede = inChoice
      ? '지금 고르는 선택지에 대한 힌트예요. 막혔을 때만 열어 보세요 — 어떤 것을 골라도 진행은 계속됩니다.'
      : '지금 보고 있는 것에 대한 힌트예요. 막혔을 때만 열어 보세요 — 그냥 넘어가도 이야기는 이어집니다.';

    const ov = openSheet(`
      <div class="sheet">
        <div class="sheet-head">
          <h2>힌트</h2><span class="sheet-sub">${ctxLabel}</span>
          <button class="x" data-close type="button">✕</button>
        </div>
        <div class="sheet-body">
          <p class="sheet-lede">${ctxLede}</p>
          ${body}
          <div class="btn-row">${more}</div>
        </div>
      </div>`);
    const m = ov.querySelector('#hintMore');
    if (m && !m.disabled) m.addEventListener('click', () => {
      App.l.hint_unlocks[id] = Math.min(list.length, (App.l.hint_unlocks[id] || 1) + 1);
      persistLearn(); renderHint(id);
    });
  }

  function updateHintDot() {
    const t = document.getElementById('tHint');
    if (!t) return;
    const lvl = App.l.shoe_hint_level;
    t.classList.toggle('ring', lvl > 0 && lvl < 3);
  }

  /* ---------------- 설정 / 상태 패널 ---------------- */
  function openPanel() {
    const s = App.s, l = App.l;
    const rows = [
      ['player_name', s.player_name || '‘손님’ (미입력)'],
      ['motivation', s.motivation || '—'],
      ['met_hodu', String(s.met_hodu)],
      ['sunja_first_impression', s.sunja_first_impression || '—'],
      ['room_key', String(s.room_key)],
      ['inspected_window', String(s.inspected_window)],
      ['inspected_bed', String(s.inspected_bed)],
      ['box_found', String(s.box_found)],
      ['photo_clues', '[' + (s.photo_clues || []).join(', ') + '] ' + (s.photo_clues || []).length + '/3'],
      ['photo_response', s.photo_response || '—'],
      ['reply', s.reply || '—'],
      ['day1_completed', String(s.day1_completed)]
    ].map(([k, v]) => `<div class="stat"><b>${k}</b><span class="v">${v}</span></div>`).join('');

    const learn = [
      ['shoe_first_try_correct', String(l.shoe_first_try_correct)],
      ['shoe_hint_level', String(l.shoe_hint_level)]
    ].map(([k, v]) => `<div class="stat"><b>${k}</b><span class="v learn">${v}</span></div>`).join('');

    const jumps = EP.SCENES.map((sc, i) =>
      `<button type="button" data-jump="${i}">${sc.no} ${sc.title}</button>`).join('');

    const ov = openSheet(`
      <div class="sheet">
        <div class="sheet-head">
          <h2>${EP.SCENES[Math.max(0, App.sceneIdx)].no} · ${EP.SCENES[Math.max(0, App.sceneIdx)].title}</h2>
          <button class="x" data-close type="button">✕</button>
        </div>
        <div class="sheet-body">
          <p class="sheet-lede">플레이어블 프로토타입 · 무음 빌드 · DAY 1</p>
          <h3>장면 이동</h3>
          <div class="jump">${jumps}</div>
          <h3>스토리 스토어 <span class="tag-lite">관계·진행</span></h3>
          ${rows}
          <h3>학습 스토어 <span class="tag-lite learn">내부 기록 전용 · 대사에 반영 안 함</span></h3>
          ${learn}
          <h3>사운드 훅 <span class="tag-lite">이번 빌드 무음</span></h3>
          <div class="cues">${EP.SOUND_CUES.map(c => `<i>${c.id} · ${c.at}</i>`).join('')}</div>
          <div class="btn-row">
            <button class="btn" id="resetBtn" type="button">처음부터</button>
            <button class="btn primary" data-close type="button">닫기</button>
          </div>
        </div>
      </div>`);

    ov.querySelectorAll('[data-jump]').forEach(b => {
      b.addEventListener('click', () => gotoScene(+b.dataset.jump));
    });
    ov.querySelector('#resetBtn').addEventListener('click', () => {
      localStorage.removeItem(S_KEY()); localStorage.removeItem(L_KEY()); localStorage.removeItem(POS_KEY());
      location.reload();
    });
  }

  /* ---------------- 소리 시트 ----------------
     음악 · 효과음 · 음성 3채널을 따로 켜고 끄고, 음량을 조절한다. */
  function openSound() {
    if (!window.EP.Audio) return null;
    EP.Audio.init();
    const c = EP.Audio.cfg;
    const row = (key, label, hint) => `
      <div class="snd-row">
        <div class="snd-lab"><b>${label}</b><span>${hint}</span></div>
        <button class="toggle" data-t="${key}" aria-pressed="${c[key] ? 'true' : 'false'}" type="button"><i></i></button>
      </div>`;

    const ov = openSheet(`
      <div class="sheet sound-sheet">
        <div class="sheet-head">
          <h2>소리</h2>
          <span class="sheet-sub">음악 · 효과음 · 음성</span>
          <button class="x" data-close type="button">✕</button>
        </div>
        <div class="sheet-body">
          ${row('musicOn', '음악', '장면에 맞는 잔잔한 피아노')}
          ${row('sfxOn', '효과음', '비 · 발소리 · 초인종 · 문 · 상자')}
          ${row('voiceOn', '음성', EP.Audio.voiceNote())}
          <div class="snd-vol">
            <label>전체 음량</label>
            <input type="range" id="volMaster" min="0" max="1" step="0.05" value="${c.master}">
          </div>
          <div class="snd-vol">
            <label>음악 음량</label>
            <input type="range" id="volMusic" min="0" max="1" step="0.05" value="${c.music}">
          </div>
          <div class="btn-row">
            <button class="btn" id="sndPreview" type="button">효과음 미리 듣기</button>
            <button class="btn primary" data-close type="button">닫기</button>
          </div>
        </div>
      </div>`);

    ov.querySelectorAll('.toggle').forEach(b => {
      b.addEventListener('click', () => {
        const k = b.dataset.t;
        const on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', String(on));
        EP.Audio.set({ [k]: on });
        if (k === 'voiceOn' && !on) EP.Audio.stopVoice();
        if (k === 'voiceOn' && on) EP.Audio.voice('비 많이 맞았네. 얼른 들어와요.', 'SUN');
        paintSoundState();
      });
    });
    ov.querySelector('#volMaster').addEventListener('input', ev => {
      EP.Audio.set({ master: +ev.target.value });
    });
    ov.querySelector('#volMusic').addEventListener('input', ev => {
      EP.Audio.set({ music: +ev.target.value });
    });
    ov.querySelector('#sndPreview').addEventListener('click', () => {
      ['bell', 'cat', 'box', 'knock', 'notify'].forEach((n, i) => setTimeout(() => EP.Audio.sfx(n), i * 520));
    });
    return ov;
  }

  function paintSoundState() {
    const b = document.getElementById('tSound');
    if (!b || !window.EP.Audio) return;
    const c = EP.Audio.cfg;
    const live = c.master > 0 && (c.musicOn || c.sfxOn || c.voiceOn);
    b.setAttribute('aria-pressed', String(live));
    b.querySelector('.lb').textContent = live ? '소리' : '무음';
    App.soundOn = live;
  }

  /* ---------------- 오늘 배운 것 (플레이어용) ----------------
     관리자 상태 패널과 달리, 스토리 변수·학습 스토어는 한 줄도 노출하지 않는다.
     단어·문장 패턴만 보여 준다. 콘텐츠는 EP.Content (관리자 페이지에서 편집). */
  function openLearning() {
    const C = (window.EP.Content ? EP.Content.data : EP.CONTENT_DEFAULT);
    const ep = C.episode || {};
    const vocab = (C.vocab || []).map(v =>
      `<li class="vrow">
         <span class="vw">${v.word}</span>
         <span class="vr">${v.pron ? v.pron + ' ' : ''}${v.roman || ''}</span>
         <span class="vm">${v.ko || ''}</span>
         <span class="ve">${v.en || ''}</span>
         <b class="vs">${v.scene || ''}</b>
       </li>`).join('');
    const gram = (C.grammar || []).map(g =>
      `<li class="grow">
         <div class="gf">${g.form}</div>
         <div class="gk">${g.ko || ''}</div>
         <div class="ge">${g.eg || ''}<small>${g.meaning || ''}</small></div>
       </li>`).join('');

    const ov = openSheet(`
      <div class="sheet learn-sheet">
        <div class="sheet-head">
          <h2>오늘 배운 것</h2>
          <span class="sheet-sub">${ep.no || 'EP.01'} · ${ep.day || 'DAY 1'}</span>
          <button class="x" data-close type="button">✕</button>
        </div>
        <div class="sheet-body">
          <p class="sheet-lede">‘${ep.title || ''}’ 에서 만난 말들. 외우지 않아도, 다시 만나면 알아볼 수 있으면 충분해요.</p>
          <h3>단어 <span class="tag-lite">${(C.vocab || []).length}개</span></h3>
          <ul class="vlist">${vocab}</ul>
          <h3>문장 패턴 <span class="tag-lite">${(C.grammar || []).length}개</span></h3>
          <ul class="glist">${gram}</ul>
          <div class="btn-row">
            <button class="btn primary" data-practice type="button">복습하기</button>
            <button class="btn" data-close type="button">닫기</button>
          </div>
        </div>
      </div>`);
    const pb = ov.querySelector('[data-practice]');
    if (pb) pb.addEventListener('click', () => { if (window.EP.Practice) EP.Practice.open('quiz'); });
    return ov;
  }

  /* ---------------- 엔딩 : DAY 1 COMPLETE ---------------- */
  function finishEpisode() {
    App.s.day1_completed = true; App.persist();
    document.getElementById('stage').classList.add('is-ending');
    const card = document.createElement('div');
    card.className = 'endcard';
    card.innerHTML = `<div class="complete">
      <p class="k">EP.01 · DAY 1</p>
      <h1>DAY 1<br>COMPLETE</h1>
      <p class="sub">비 오는 소담길 · 첫날의 기록</p>
    </div>`;
    document.getElementById('stage').appendChild(card);
    setTimeout(() => { card.style.transition = 'opacity .8s'; card.style.opacity = '0'; setTimeout(() => { card.remove(); showReward(); }, 800); }, 2600);
  }

  /* ---------------- 보상 화면 ---------------- */
  function showReward() {
    const s = App.s, R = EP.REWARD;
    const threads = EP.DAY2.filter(d => d.when(s));
    document.getElementById('stage').classList.add('is-ending');
    document.getElementById('hud').style.display = 'none';
    const card = document.createElement('div');
    card.className = 'reward';
    /* 명세 §5 : 호두는 met_hodu === true 인 경우에만 표시 → 미조우 시 항목 자체를 넣지 않는다 */
    card.innerHTML = `
      <p class="eyebrow">DAY 1 · 보상</p>
      <h1>${R.memory.v}</h1>
      <p class="lede">${R.memory.s}</p>
      <div class="div"></div>

      <div class="rgrid">
        <div class="rrow"><div class="k">${R.memory.k}</div><div class="v">${R.memory.v}</div></div>
        ${R.people.map(p => `<div class="rrow"><div class="k">${p.k}</div><div class="v">${p.v}<small>${p.s}</small></div></div>`).join('')}
        ${s.met_hodu ? `<div class="rrow"><div class="k">${R.animal.k}</div><div class="v">${R.animal.v}<small>${R.animal.s}</small></div></div>` : ''}
        ${R.items.map(it => `<div class="rrow"><div class="k">${it.k}</div><div class="v">${it.v}<small>${it.s}</small></div></div>`).join('')}
        <div class="rrow"><div class="k">${R.place.k}</div><div class="v">${R.place.v}<small>${R.place.s}</small></div></div>
        ${(s.photo_clues || []).length === 3 ? `<div class="rrow"><div class="k">단서</div><div class="v">사진 속 단서 3/3<small>건물 · 사람들 · 뒷면</small></div></div>` : ''}
      </div>

      <div class="nextcard">
        <p class="t">다음 이야기</p>
        <h2>DAY 2 〈골목 끝의 작은 카페〉</h2>
        <p>오늘의 선택은 내일의 첫 문장이 됩니다. 아래는 이번 플레이에서 DAY 2로 넘어가는 값들입니다.</p>
        <div class="thread">
          ${threads.map(t => `<i>${t.who && t.who !== '—' ? `<b>${t.who}</b>` : ''}${t.ko}</i>`).join('')}
        </div>
      </div>

      <div class="acts">
        <button class="practice" id="practiceBtn" type="button">복습하기</button>
        <button class="primary" id="againBtn" type="button">다시 플레이</button>
        <button id="learnBtn" type="button">오늘 배운 것</button>
        <button id="keepBtn" type="button">이 선택으로 남겨 두기</button>
      </div>`;
    document.getElementById('stage').appendChild(card);
    card.querySelector('#againBtn').addEventListener('click', () => {
      localStorage.removeItem(S_KEY()); localStorage.removeItem(L_KEY()); localStorage.removeItem(POS_KEY());
      location.reload();
    });
    card.querySelector('#learnBtn').addEventListener('click', openLearning);
    card.querySelector('#practiceBtn').addEventListener('click', () => { if (window.EP.Practice) EP.Practice.open('quiz'); });
    card.querySelector('#keepBtn').addEventListener('click', e => { e.target.textContent = '저장되었습니다'; });
    card.querySelectorAll('.rrow').forEach((r, i) => {
      r.classList.add('new'); r.style.animationDelay = (0.08 * i) + 's';
    });
  }

  /* ---------------- 스케일 ----------------
     부팅 시점에 부모가 아직 크기를 주지 않은 경우(iframe 폭 0) 배율이 0 이 되어
     화면이 통째로 사라진다. 크기가 잡힐 때까지 재시도하고, 크기 변화도 계속 따라간다. */
  let fitTries = 0;
  function measure() {
    /* 실제 컨테이너 크기를 먼저 본다. 부모가 아직 크기를 주지 않은 순간에는
       innerWidth 가 0 으로 보고되기도 하므로 여러 값을 견준다. */
    const fr = document.getElementById('frame');
    const cands = [];
    if (fr) { cands.push([fr.clientWidth, fr.clientHeight]); cands.push([fr.offsetWidth, fr.offsetHeight]); }
    cands.push([window.innerWidth, window.innerHeight]);
    cands.push([document.documentElement.clientWidth, document.documentElement.clientHeight]);
    for (const [w, h] of cands) {
      if (w >= 120 && h >= 120) return [w, h];
    }
    return null;
  }
  function fit() {
    const st = document.getElementById('stage');
    if (!st) return false;
    const m = measure();
    if (!m) return false;
    const k = Math.min(m[0] / 1080, m[1] / 1920);
    if (!(k > 0.02)) return false;      /* 잘못된 배율은 절대 쓰지 않는다 */
    st.style.transform = `translate(-50%,-50%) scale(${k})`;
    st.dataset.fitted = '1';
    fitTries = 0;
    return true;
  }
  function fitUntil() {
    if (fit()) return;
    if (++fitTries > 600) return;          /* 약 10초까지 재시도 */
    setTimeout(fitUntil, 16);
  }

  /* ---------------- 부팅 ---------------- */
  function boot() {
    EP.Art.mount(el.art);
    App.flow = flatten();
    fitUntil();
    window.addEventListener('load', fitUntil);
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', () => setTimeout(fit, 120));
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => fit());
      ro.observe(document.documentElement);
      const fr = document.getElementById('frame');
      if (fr) ro.observe(fr);
    }

    EP.Art.show('plane');
    el.dlg.hidden = true;

    /* 앱 설정(관리자 페이지에서 편집) */
    const SET = (window.EP.Content ? EP.Content.data.settings : {}) || {};
    if (SET.translateDefault) {
      App.english = true;
      document.getElementById('tTrans').setAttribute('aria-pressed', 'true');
      document.querySelectorAll('.sub.en, .in-en, .h-en').forEach(n => n.classList.add('on'));
    }
    App.hintAuto = !!SET.hintAuto;
    paintSoundState();

    /* 대사 탭 진행 */
    el.dlg.addEventListener('click', advance);
    window.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); advance(); }
      if (e.key === 't' || e.key === 'T') toggleTrans();
      if (e.key === 'h' || e.key === 'H') openHint();
      if (e.key === 'Escape') closeOv();
    });

    let sy = 0;
    el.dlg.addEventListener('pointerdown', e => { sy = e.clientY; });
    el.dlg.addEventListener('pointerup', e => { if (sy - e.clientY > 34) advance(); });

    /* 번역 토글 */
    function toggleTrans() {
      App.english = !App.english;
      const b = document.getElementById('tTrans');
      b.setAttribute('aria-pressed', String(App.english));
      el.en.classList.toggle('on', !!(App.english && el.en.innerHTML));
      document.querySelectorAll('.sub.en').forEach(n => n.classList.toggle('on', App.english));
      document.querySelectorAll('.in-en').forEach(n => n.classList.toggle('on', App.english));
      document.querySelectorAll('.h-en').forEach(n => n.classList.toggle('on', App.english));
      try { localStorage.setItem('ep01.en', App.english ? '1' : '0'); } catch (e) {}
    }
    App.toggleTrans = toggleTrans;
    document.getElementById('tTrans').addEventListener('click', toggleTrans);
    document.getElementById('tHint').addEventListener('click', () => {
      const btn = document.getElementById('tHint');
      if (btn.disabled) return;
      const ov = document.getElementById('ov');
      if (ov && !ov.hidden) return;   /* 시트가 이미 열려 있으면 겹치지 않게 무시 */
      openHint();
    });

    /* 소리 : 음악·효과음·음성 설정 시트 */
    document.getElementById('tSound').addEventListener('click', () => {
      if (window.EP.Audio) { EP.Audio.init(); EP.Audio.sfx('tap'); }
      openSound();
    });
    App.sound = App.sound;    /* 큐 재생은 App.sound 사용 */
    App.refreshHintState = refreshHintState;
    App.paintSoundState = paintSoundState;

    /* 시작 화면 — 이름 한 칸. 로그인 화면 없이 바로 들어간다.
       링크를 받은 사람이 아무 설명 없이도 첫 장면까지 도달하게 하는 것이 목적. */
    const nameIn = document.getElementById('nameIn');
    const startBtn = document.getElementById('startBtn');
    const resumeBtn = document.getElementById('resumeBtn');

    /* 이 브라우저에 저장된 진행이 있으면 '이어서 하기'를 띄운다 */
    const lastId = (() => {
      const s = EP.Auth.session();
      return s ? s.id : null;
    })();
    const savedPos = (() => {
      if (!lastId) return null;
      try { return JSON.parse(localStorage.getItem(EP.Auth.keys(lastId).pos) || 'null'); } catch (err) { return null; }
    })();
    if (savedPos && savedPos.cursor > 0 && resumeBtn) resumeBtn.hidden = false;

    nameIn.addEventListener('keydown', ev => { if (ev.key === 'Enter') startBtn.click(); });

    setTimeout(() => { try { if (location.hash !== '#skip') nameIn.focus({ preventScroll: true }); } catch (err) {} }, 400);

    function begin(cursor) {
      /* 첫 사용자 제스처 — 브라우저 자동재생 정책 때문에 여기서 오디오를 연다 */
      if (window.EP.Audio) EP.Audio.init();
      const nm = (nameIn.value || '').trim().slice(0, 12);
      /* 공유 링크로 처음 온 사람 : 계정이 없으면 게스트 계정을 만들어 바로 시작한다.
         (관리자 페이지의 유저 목록에도 이 계정이 잡힌다) */
      const me = EP.Auth.current() || EP.Auth.ensure(nm);
      /* 계정이 확정된 뒤 그 계정의 저장본을 다시 읽는다 —
         공유 링크로 처음 온 사람도 자기 계정 키에 처음부터 쌓인다. */
      if (!cursor) {
        App.s = load(S_KEY(), DEFAULT_STORY);
        App.l = load(L_KEY(), DEFAULT_LEARN);
      }
      App.s.player_name = nm || App.s.player_name || '손님';
      App.persist();
      const st = document.getElementById('start');
      st.classList.add('gone');
      setTimeout(() => { st.hidden = true; }, 720);
      el.prog.style.width = '0%';
      if (cursor) {
        App.cursor = cursor; App.sceneIdx = -1;
        App.s = load(S_KEY(), DEFAULT_STORY);
        App.l = load(L_KEY(), DEFAULT_LEARN);
      }
      run();
    }
    startBtn.addEventListener('click', () => begin(0));
    if (resumeBtn) resumeBtn.addEventListener('click', () => {
      const me = EP.Auth.current();
      let sp = null;
      try { sp = JSON.parse(localStorage.getItem(EP.Auth.keys(me.id).pos) || 'null'); } catch (err) {}
      begin((sp && sp.cursor) || 0);
    });

    /* 상호작용 UI 보조 CSS 클래스 */
    updateHintDot();

    /* 점검용 바깥 연결 */
    App.goto = gotoScene;
    App.next = advance;
    App.panel = openPanel;   /* 관리자/개발용 — 플레이어 화면에는 노출하지 않는다 */
    App.learn = openLearning;
    App.hint = openHint;
    App.reward = showReward;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
