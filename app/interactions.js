/* ==========================================================================
   interactions.js — 4종 상호작용 (ACTION / INVESTIGATE / LANG 조립)
   A01 신발 · A02 방 · I01 사진 · L02 자기소개
   모두 실패로 진행이 막히지 않는다. 오답은 재시도 + 단계별 힌트.
   ========================================================================== */
window.EP = window.EP || {};

(function () {
  const ui = () => document.getElementById('stageui');
  const openCards = new Set();
  function closeAllCards() {
    [...openCards].forEach(fn => { try { fn(); } catch (e) {} });
    openCards.clear();
  }
  const noteLayer = () => document.getElementById('noteLayer') || document.getElementById('stageui');

  /* 조사 결과 카드 — 명세가 정한 "출력" 문장을 그대로 보여준다 */
  /* 조사 결과 카드 — 명세가 정한 "출력" 문장을 그대로 보여준다
     · 자동 소멸 4.5초 (최소) + 탭/버튼으로 닫기 병행
     · 닫혀도 카운터·진행에는 영향 없음 */
  function insight(opts) {
    const host = noteLayer();
    const el = document.createElement('div');
    el.className = 'insight in';
    el.innerHTML = `
      <div class="in-k">${opts.label || ''}</div>
      <p class="in-t">${opts.ko}</p>
      ${opts.en ? `<p class="in-en ${EP.App.english ? 'on' : ''}">${opts.en}</p>` : ''}
      ${opts.btn ? `<button class="in-btn" type="button">${opts.btn}</button>`
                 : `<div class="in-tap">탭하여 닫기</div>`}`;
    host.appendChild(el);
    return new Promise(resolve => {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        openCards.delete(close);
        clearTimeout(timer);
        el.classList.remove('in');
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 320);
        resolve();
      };
      const cfgMs = (window.EP.Content ? EP.Content.data.settings.cardAutoMs : 4500) || 4500;
      const ms = opts.btn ? 0 : Math.max(opts.ms || 0, cfgMs);
      /* 카드가 실제로 화면에 붙은 다음 프레임부터 기산한다 */
      let timer = null;
      if (ms) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!closed) timer = setTimeout(close, ms);
          });
        });
      }
      el.addEventListener('click', e => {
        if (e.target.closest('.in-btn')) return;
        close();
      });
      const btn = el.querySelector('.in-btn');
      if (btn) btn.addEventListener('click', close);
      openCards.add(close);
    });
  }

  const Interact = {
    /* ---------------------------------------------------------------- A01 */
    shoes(ctx) {
      const host = ui();
      document.getElementById('stage').classList.add('shoes-mode');
      let removed = false, firstTap = true, done = false;

      host.innerHTML = `
        <div class="shoes">
          <div class="lbl">신발은 여기서 벗어요<small>무엇을 할까요?</small></div>
          <div class="row">
            <button class="hot" type="button" data-k="shoe">
              <span class="ring2"></span>
              <div class="ico ico-sneaker"><div class="sole"></div><div class="up"></div><div class="lace"></div></div>
              <span class="cap">신발</span>
            </button>
            <button class="hot" type="button" data-k="slipper">
              <span class="ring2"></span>
              <div class="ico ico-slipper"><div class="sole"></div><div class="up"></div></div>
              <span class="cap">실내화</span>
            </button>
            <button class="hot" type="button" data-k="bag">
              <span class="ring2"></span>
              <div class="ico ico-bag"><div class="h"></div><div class="b"></div><div class="s"></div></div>
              <span class="cap">가방</span>
            </button>
          </div>
          <div class="shoes-fb" id="shoeFb"></div>
        </div>`;

      const fb = host.querySelector('#shoeFb');
      const shoeBtn = host.querySelector('[data-k="shoe"]');
      const slipBtn = host.querySelector('[data-k="slipper"]');

      const say = (text, en) => {
        fb.innerHTML = `<span class="who">순자</span><span class="tx">${text}</span>
          <span class="en ${EP.App.english ? 'on' : ''}">${en}</span>`;
        fb.classList.remove('in'); void fb.offsetWidth; fb.classList.add('in');
      };

      const wrong = () => {
        firstTap = false;
        const lvl = ctx.bumpShoeHint();     /* 학습 스토어 — 관계/대사에 반영하지 않음 */
        if (lvl <= 1) say('신발은 여기서 벗어요.', 'You take your shoes off here.');
        else if (lvl === 2) {
          say('신발은 여기서 벗어요.', 'You take your shoes off here.');
          shoeBtn.classList.add('lit');
        } else {
          say('신발은 여기서 벗어요.', 'You take your shoes off here.');
          shoeBtn.classList.add('lit');
          ctx.openHint('S04');
        }
      };

      const finish = () => {
        if (done) return;
        done = true;
        document.getElementById('stage').classList.remove('shoes-mode');
        ctx.recordShoe(firstTap);          /* 첫 시도에 신발을 벗었는지 = 내부 기록 전용 */
        setTimeout(async () => {
          host.innerHTML = '';
          await ctx.note('신발을 벗고 실내화로 갈아 신었다.', 'I took my shoes off and stepped into the indoor slippers.');
          ctx.done();
        }, 420);
      };

      shoeBtn.addEventListener('click', () => {
        if (removed) return;
        removed = true;
        shoeBtn.classList.add('gone');
        const ico = shoeBtn.querySelector('.ico');
        ico.style.transition = 'transform .5s cubic-bezier(.3,0,.2,1), opacity .5s';
        ico.style.transform = 'translate(-30px, 26px) rotate(-9deg)';
        ico.style.opacity = '.34';
        shoeBtn.querySelector('.cap').textContent = '벗었다';
        slipBtn.classList.add('lit');
        fb.innerHTML = '';
        setTimeout(() => {
          if (!done) {
            fb.innerHTML = `<span class="who">나</span><span class="tx">이제 실내화를 신으면 되나?</span>`;
            fb.classList.add('in');
          }
        }, 500);
      });

      slipBtn.addEventListener('click', () => {
        if (!removed) return wrong();
        slipBtn.querySelector('.ico').style.transform = 'translateY(-14px)';
        slipBtn.querySelector('.cap').textContent = '신었다';
        finish();
      });

      host.querySelector('[data-k="bag"]').addEventListener('click', () => {
        firstTap = false;
        say('가방은 그냥 두세요.', 'Just leave the bag there.');
      });
    },

    /* ---------------------------------------------------------------- A02 */
    room(ctx) {
      const host = ui();
      host.innerHTML = `
        <div class="room-ui">
          <button class="roomhot pulse" type="button" data-r="window" style="right:80px;top:230px;width:440px;height:560px">
            <span>창문</span></button>
          <button class="roomhot" type="button" data-r="bed" style="left:20px;bottom:470px;width:520px;height:330px">
            <span>침대</span></button>
          <button class="roomhot" type="button" data-r="desk" style="right:60px;bottom:610px;width:440px;height:250px">
            <span>책상</span></button>
          <div class="room-hint">방을 둘러보세요 · 세 곳 모두 반복해서 볼 수 있어요</div>
          <div class="room-action" id="roomAction" hidden>
            <span class="ra-tx">아직 둘러볼 곳이 남았어요.</span>
            <button type="button" class="ra-btn" id="openBox">상자 열기</button>
          </div>
        </div>`;

      const TEXT = {
        window: { label: '창문', ko: '창밖으로 호두가 보인다. 비가 그쳤나 보다.', en: 'Hodu is outside the window. Looks like the rain has stopped.' },
        bed: { label: '침대', ko: '깨끗한 이불이 가지런히 놓여 있다. 누군가 미리 준비한 것 같다.', en: 'A clean blanket, laid out neatly. Someone prepared it in advance.' },
        desk: { label: '책상', ko: '책상 위에 오래된 나무 상자가 놓여 있다.', en: 'An old wooden box sits on the desk.' }
      };

      let busy = false;
      let opened = false;
      const action = host.querySelector('#roomAction');
      const openBtn = host.querySelector('#openBox');

      /* 상자 열기 — 이 버튼을 눌러야만 방을 떠난다. 두 번 트리거되지 않는다. */
      openBtn.addEventListener('click', () => {
        if (opened) return;
        opened = true;
        action.hidden = true;
        host.innerHTML = '';
        busy = false;
        ctx.done();
      });

      host.querySelectorAll('.roomhot').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (busy || opened) return;
          busy = true;
          const k = btn.dataset.r;
          const t = TEXT[k];
          btn.classList.add('done');
          btn.classList.remove('pulse');

          if (k === 'window') {
            ctx.story({ inspected_window: true });
            EP.App.sound('window');
            const h = EP.Art.fig('hodu');
            if (h) { h.style.bottom = '760px'; h.style.opacity = '.85'; }
            await insight({ ...t, ms: 2400 });
            if (h) { h.classList.add('out'); setTimeout(() => h.remove(), 460); }
          } else if (k === 'bed') {
            ctx.story({ inspected_bed: true });
            await insight({ ...t, ms: 2400 });
          } else {
            /* 책상 = 단서 카드만. 방은 그대로 열어 두고 '상자 열기' 액션을 띄운다. */
            ctx.story({ box_found: true });
            await insight({ ...t, ms: 2400 });
            if (!opened) action.hidden = false;
          }
          busy = false;
        });
      });
    },

    /* ---------------------------------------------------------------- I01
       사진 조사 — 앞면 이미지를 카드에 얹고, 그 위에 투명 히트 영역 2개.
       · 건물 / 사람들 : % 좌표 히트 영역 (겹침 0)
       · 뒷면          : 사진 전체 탭으로 뒤집기
       카운터 3/3 은 앞면 2개 + 뒷면 1개.                                    */
    photo(ctx) {
      const host = ui();
      const found = new Set(EP.App.s.photo_clues || []);
      const wrap = document.querySelector('.set-photo .photo-wrap');
      const card = document.getElementById('photoCard');

      host.innerHTML = `
        <div class="photo-counter" id="pcount">
          <b><span id="pcNow">${found.size}</span>/3</b>
          <span class="bar"><i id="pcBar" style="width:${(found.size / 3) * 100}%"></i></span>
          <span class="pc-lb">단서</span>
        </div>`;

      if (!wrap) return;
      wrap.querySelectorAll('.pin-layer, .pin-legend').forEach(n => n.remove());

      /* 히트 영역 : 지정한 % 그대로. 버튼 = 클릭 영역, 점선 원만 그 안에 띄운다. */
      const layer = document.createElement('div');
      layer.className = 'pin-layer';
      layer.innerHTML = `
        <button class="pin" type="button" data-c="building" aria-label="건물"
          style="left:46%;top:8%;width:24%;height:22%"><span class="dot"></span></button>
        <button class="pin" type="button" data-c="people" aria-label="사람들"
          style="left:8%;top:31%;width:80%;height:21%"><span class="dot"></span></button>`;
      wrap.appendChild(layer);

      /* 이름표는 사진 위가 아니라 사진 아래 범례에 둔다 */
      const legend = document.createElement('div');
      legend.className = 'pin-legend';
      legend.innerHTML = `
        <button type="button" data-c="building"><span class="ring"></span>건물</button>
        <button type="button" data-c="people"><span class="ring"></span>사람들</button>
        <button type="button" data-c="back"><span class="ring"></span>뒷면</button>`;
      /* 범례는 사진 카드 바깥(화면 하단)에 둔다 — 사진 위에 글자를 얹지 않는다 */
      const setHost = document.querySelector('.set-photo') || wrap.parentElement;
      setHost.appendChild(legend);

      const CLUE = {
        building: { label: '단서 1 · 건물', ko: '사진 속 건물에는 반달 장식과 둥근 창문이 있다. 어디서 본 것 같은데...', en: 'The building has a crescent ornament and round windows. I feel like I\'ve seen it somewhere...' },
        people: { label: '단서 2 · 사람들', ko: '세 명이 웃고 있다. 왼쪽 사람은 순자 할머니와 조금 닮은 것 같다.', en: 'Three people, laughing. The one on the left looks a little like Sunja.' },
        back: { label: '단서 3 · 사진 뒷면', ko: '\'30일 후, 여기서 다시 만나자.\' 오래된 날짜가 함께 적혀 있다.', en: '"Let\'s meet here again in thirty days." An old date is written beneath it.' }
      };

      let busy = false;
      const pins = layer.querySelectorAll('.pin');

      const markDone = () => {
        const now = document.getElementById('pcNow');
        const bar = document.getElementById('pcBar');
        if (now) now.textContent = found.size;
        if (bar) bar.style.width = (found.size / 3) * 100 + '%';
      };

      const syncDone = () => {
        layer.querySelectorAll('.pin').forEach(p => { if (found.has(p.dataset.c)) p.classList.add('done'); });
        legend.querySelectorAll('button').forEach(b => { if (found.has(b.dataset.c)) b.classList.add('done'); });
      };

      const gain = c => {
        if (found.has(c)) return false;
        found.add(c);
        EP.App.s.photo_clues = [...found];
        EP.App.persist();
        syncDone();
        markDone();
        return true;
      };

      const finishIfFull = async () => {
        if (found.size !== 3) return false;
        const pc = document.getElementById('pcount');
        if (pc) pc.classList.add('full');
        if (card && card.classList.contains('flip')) card.classList.remove('flip');
        layer.style.opacity = '0';
        await insight({ label: '조사 완료', ko: '모든 단서를 발견했습니다.', en: 'You found every clue.', ms: 1600, btn: '계속' });
        host.innerHTML = '';
        if (wrap) wrap.querySelectorAll('.pin-layer').forEach(n => n.remove());
        document.querySelectorAll('.set-photo .pin-legend').forEach(n => n.remove());
        busy = false;
        ctx.done();
        return true;
      };

      /* 앞면 복원 : 이미 찾은 단서는 체크 표시 */
      syncDone();

      /* 뒷면 단서 — 사진 탭과 범례 '뒷면' 버튼이 완전히 같은 경로를 쓴다.
         이미 뒤집혀 있으면 애니메이션 없이 카드만. */
      const doBack = async () => {
        if (busy) return;
        busy = true;
        if (card && !card.classList.contains('flip')) {
          card.classList.add('flip');
          layer.style.transition = 'opacity .35s';
          layer.style.opacity = '0';
          layer.style.pointerEvents = 'none';
          const hint = document.getElementById('photoHint');
          if (hint) hint.textContent = '뒷면';
          await new Promise(r => setTimeout(r, 1060));   /* .photo 플립 1.05s */
        }
        gain('back');
        EP.App.sound('photo-clue');
        await insight({ ...CLUE.back, ms: 2500 });
        if (await finishIfFull()) return;
        busy = false;
      };

      const startClue = async c => {
        if (c === 'back') return doBack();
        if (busy) return;
        busy = true;
        gain(c);
        EP.App.sound('photo-clue');
        await insight({ ...CLUE[c], ms: 2500 });
        if (await finishIfFull()) return;
        busy = false;
      };

      pins.forEach(p => {
        p.addEventListener('click', e => { e.stopPropagation(); startClue(p.dataset.c); });
      });
      legend.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', e => { e.stopPropagation(); startClue(b.dataset.c); });
      });

      /* 사진 전체 탭도 뒷면으로 */
      const onFlip = e => {
        if (e.target.closest('.pin')) return;
        doBack();
      };
      /* 사진 카드는 재사용되는 DOM 이라 리스너를 매번 갈아 끼운다 */
      if (wrap._onFlip) wrap.removeEventListener('click', wrap._onFlip);
      wrap._onFlip = onFlip;
      wrap.addEventListener('click', onFlip);

      /* 안내 문구 : 사진 탭과 범례 버튼 둘 다 동작한다는 걸 알린다 */
      const hintEl = document.getElementById('photoHint');
      if (hintEl) hintEl.textContent = '사진을 누르거나 아래 ‘뒷면’을 누르세요';
    },

    /* ---------------------------------------------------------------- L02
       자기소개 조립 — 정답 토큰 3개 + 명백히 틀린 토큰 2개.
       틀린 토큰은 '말이 되는 다른 표현'이 아니라 문장이 성립하지 않는 말로 둔다
       (이것은 / 아니에요). 틀려도 진행은 막지 않고, 왜 안 되는지만 짚어 준다.  */
    compose(ctx) {
      const host = ui();
      document.getElementById('stage').classList.add('compose-mode');
      const name = EP.App.s.player_name || '손님';

      const TOKENS = [
        { t: '이것은', ok: false, why: '‘이것은’은 사물을 가리키는 말이에요. 사람인 나는 ‘저는’이라고 해요.' },
        { t: '저는', ok: true },
        { t: '[이름]', ok: true },
        { t: '아니에요', ok: false, why: '‘아니에요’는 부정하는 말이에요. 자기소개는 ‘입니다’로 끝나요.' },
        { t: '입니다', ok: true }
      ];
      const label = t => (t === '[이름]' ? name : t);
      let picked = [];

      host.innerHTML = `
        <div class="compose">
          <div class="cp-q"><span class="who">순자</span>그런데 이름이 어떻게 돼요?</div>
          <div class="cp-slots" id="cpSlots">
            <span class="slot"><i>1</i></span><span class="slot"><i>2</i></span><span class="slot"><i>3</i></span>
          </div>
          <div class="cp-tokens" id="cpTok">
            ${TOKENS.map(o => `<button type="button" data-t="${o.t}">${label(o.t)}</button>`).join('')}
          </div>
          <div class="cp-fb" id="cpFb">순서대로 눌러 자기소개를 완성해 보세요.</div>
          <div class="cp-acts">
            <button type="button" class="cp-reset" id="cpReset">다시</button>
            <button type="button" class="cp-ok" id="cpOk" disabled>말하기</button>
          </div>
        </div>`;

      const slots = host.querySelectorAll('.slot');
      const fb = host.querySelector('#cpFb');
      const okBtn = host.querySelector('#cpOk');
      const tokenWrap = host.querySelector('#cpTok');

      const paint = () => {
        slots.forEach((s, i) => {
          s.innerHTML = picked[i] ? label(picked[i]) : '<i>' + (i + 1) + '</i>';
          s.classList.toggle('filled', !!picked[i]);
        });
        okBtn.disabled = picked.length !== 3;
      };

      tokenWrap.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => {
          if (picked.length >= 3) return;
          const t = b.dataset.t;
          const meta = TOKENS.find(o => o.t === t);

          /* 틀린 토큰 : 자리에 넣지 않고, 왜 안 되는지 한 줄로 알려 준다 */
          if (meta && !meta.ok) {
            b.classList.add('no');
            setTimeout(() => b.classList.remove('no'), 520);
            fb.innerHTML = `<span class="warn">${meta.why}</span>`;
            ctx.bumpHint('L02');
            return;
          }

          picked.push(t);
          paint();
          if (picked.length === 3) {
            fb.innerHTML = '완성! ‘말하기’를 누르세요.';
            return;
          }
          fb.innerHTML = picked.length === 1
            ? '좋아요. 이제 내 이름을 넣어 보세요.'
            : '마지막은 문장을 닫는 말이에요.';
        });
      });

      host.querySelector('#cpReset').addEventListener('click', () => {
        picked = []; paint();
        fb.textContent = '처음부터 다시. 순서대로 눌러 보세요.';
      });

      okBtn.addEventListener('click', async () => {
        host.innerHTML = '';
        document.getElementById('stage').classList.remove('compose-mode');
        await ctx.note(`저는 ${name}입니다.`, `I am ${name}.`, 1200);
        ctx.done();
      });
      paint();
    },

    run(kind, ctx) {
      if (kind === 'shoes') return Interact.shoes(ctx);
      if (kind === 'room') return Interact.room(ctx);
      if (kind === 'photo') return Interact.photo(ctx);
      if (kind === 'compose') return Interact.compose(ctx);
    },

    insight,
    closeAllCards
  };

  window.EP.Interact = Interact;
})();
