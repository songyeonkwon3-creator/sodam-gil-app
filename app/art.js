/* ==========================================================================
   art.js — 배경 세트 9종 + 피겨 + 소품을 DOM 으로 생성
   일러스트가 아니라 빛·재질·실루엣 레이어. 교체 가능한 1차 아트 패스.
   ========================================================================== */
window.EP = window.EP || {};

(function () {
  function art_fallbackFig(el, kind, opts) {
    el.classList.remove('has-img');
    el.innerHTML = kind === 'sunja' ? SUNJA : HODU;
    if (kind === 'hodu') { el.style.width = '360px'; el.style.height = '360px'; el.style.bottom = '346px'; el.style.left = '24%'; }
    const exp = (opts && opts.exp) || (el.dataset && el.dataset.exp) || 'default';
    const s = el.querySelector('.sunja');
    if (s) s.dataset.exp = exp;
  }

  const videoEls = {};   /* 세트별 배경 비디오 (재생 제어용) */

  const SETS = {
    plane: `
      <div class="fx" style="background:radial-gradient(60% 34% at 78% 34%, rgba(120,146,180,.22), transparent 70%)"></div>
      <div class="cabin"></div>
      <div class="window"><div class="city"></div></div>
      <div class="tray"></div>
      <div class="wing"></div>
      <div class="seat"></div>
      <div class="headrest"></div>
      <div class="glare"></div>
      <div class="fx rain" data-rain="soft"></div>`,

    alley: `
      <div class="sky"></div>
      <div class="bldgL"></div>
      <div class="bldgR"></div>
      <div class="lamp"></div>
      <div class="road"></div>
      <div class="gate"></div>
      <div class="fx rain on"></div>
      <div class="fx" style="background:radial-gradient(50% 34% at 62% 24%, rgba(236,243,238,.20), transparent 68%)"></div>`,

    gate: `
      <div class="wall"></div>
      <div class="pot"></div>
      <div class="warmth"></div>
      <div class="gd"><div class="slit"></div></div>
      <div class="bell"></div>
      <div class="jipung"></div>
      <div class="step"></div>
      <div class="fx rain slow on"></div>`,

    genkan: `
      <div class="wallL"></div>
      <div class="shoji"><i></i><i></i><i></i><i></i></div>
      <div class="threshold"></div>
      <div class="floor"></div>
      <div class="stand"></div>
      <div class="fx" style="position:absolute;left:-10%;top:0;width:70%;height:60%;background:linear-gradient(160deg,rgba(255,238,200,.20),transparent 70%);filter:blur(30px);mix-blend-mode:screen"></div>`,

    kitchen: `
      <div class="wall"></div>
      <div class="tiles"></div>
      <div class="wind"></div>
      <div class="stairs"></div>
      <div class="counter"></div>
      <div class="steam"></div>
      <div class="cups"><i></i><i></i></div>
      <div class="kettle"></div>
      <div class="fx" style="position:absolute;right:-6%;top:-4%;width:66%;height:52%;background:radial-gradient(closest-side,rgba(255,236,196,.34),transparent 72%);filter:blur(40px);mix-blend-mode:screen"></div>`,

    room: `
      <div class="wall"></div>
      <div class="window"></div>
      <div class="curtain"></div>
      <div class="lightshaft"></div>
      <div class="floor"></div>
      <div class="bed"></div>
      <div class="desk"></div>
      <div class="plant"></div>
      <div class="box"></div>`,

    roomNight: `
      <div class="wall"></div>
      <div class="window"></div>
      <div class="curtain"></div>
      <div class="lightshaft"></div>
      <div class="floor"></div>
      <div class="bed"></div>
      <div class="desk"></div>
      <div class="plant"></div>
      <div class="box"></div>`,

    photo: `
      <div class="table"></div>
      <div class="photo-wrap">
        <div class="photo" id="photoCard">
          <div class="face"><img class="shot" alt="" decoding="async"></div>
          <div class="back">
            <span class="hand">‘30일 후,<br>여기서 다시 만나자.’</span>
            <span class="stamp">1985 · 08 · 17 · 소담길</span>
          </div>
        </div>
      </div>
      <div class="photo-hint" id="photoHint">사진을 눌러 뒤집어 보기</div>`,

    door: `
      <div class="wall"></div>
      <div class="halllight"></div>
      <div class="floorline"></div>
      <div class="frame"><div class="gap"></div><div class="leaf"><div class="knob"></div></div></div>`
  };

  const SUNJA = `
    <div class="sunja" data-exp="default">
      <div class="f-body"></div>
      <div class="f-apron"></div>
      <div class="f-neck"></div>
      <div class="f-head">
        <div class="f-hair"></div>
        <div class="f-face">
          <span class="brow l"></span><span class="brow r"></span>
          <span class="eye l"></span><span class="eye r"></span>
          <span class="f-cheek"></span>
          <span class="mouth"></span>
        </div>
      </div>
    </div>`;

  const HODU = `
    <div class="hodu">
      <div class="tail"></div><div class="body"></div><div class="head"></div>
      <div class="ear l"></div><div class="ear r"></div>
      <div class="eye l"></div><div class="eye r"></div>
    </div>`;

  /* 장면 안에서 바꿔 끼우는 배경 (그림이 없을 때는 원래 세트 모양으로 폴백) */
  SETS.planePhone = SETS.plane;
  SETS.gateFront = SETS.gate;

  window.EP.Art = {
    mount(host) {
      host.innerHTML = '';
      const SRC = window.EP.ART_SRC || {};
      Object.keys(SETS).forEach(key => {
        const d = document.createElement('div');
        d.className = 'set set-' + key;
        d.dataset.set = key;
        d.innerHTML = SETS[key];
        /* roomNight 은 set-room 레이어 위에 night 변형만 얹는다 */
        if (key === 'roomNight') { d.className = 'set set-room night'; }

        /* 정본 이미지가 있으면 맨 아래에 깔고, CSS 레이어는 그 위의 빛·비 효과로만 남긴다.
           S07 사진 세트는 예외 — 이미지는 카드 앞면(.face) 안에 들어간다. */
        const src = SRC[key];
        if (key === 'photo' && src) {
          const shot = d.querySelector('.face .shot');
          if (shot) {
            shot.src = src;
            shot.addEventListener('error', () => { shot.remove(); d.classList.remove('photo-img'); });
          }
          d.classList.add('photo-img');
          host.appendChild(d);
          return;
        }
        /* 배경 영상이 있으면 정지 이미지보다 먼저 깔고, 로드 실패 시 CSS 폴백으로 돌아간다 */
        const vsrc = (window.EP.ART_VIDEO || {})[key];
        if (vsrc) {
          const vid = document.createElement('video');
          vid.className = 'artvid';
          vid.muted = true; vid.loop = true; vid.autoplay = false;
          vid.setAttribute('playsinline', ''); vid.setAttribute('muted', '');
          vid.setAttribute('disablepictureinpicture', '');
          vid.preload = 'auto';
          vid.poster = '';
          vid.src = vsrc;
          vid.addEventListener('error', () => { vid.remove(); d.classList.remove('has-vid'); });
          d.insertBefore(vid, d.firstChild);
          d.classList.add('has-vid');
          videoEls[key] = vid;
        }
        if (src) {
          const img = document.createElement('img');
          img.className = 'artimg';
          img.alt = '';
          img.decoding = 'async';
          img.src = src;
          /* 이미지가 없거나 깨지면 CSS 레이어 폴백이 그대로 보이도록 */
          img.addEventListener('error', () => { img.remove(); });
          d.insertBefore(img, d.firstChild);
          d.classList.add('has-img');
        }
        host.appendChild(d);
      });
    },

    show(key) {
      const host = document.getElementById('art');
      host.querySelectorAll('.set').forEach(s => {
        s.classList.toggle('on', s.dataset.set === key);
      });
      /* 배경 영상 : 활성 세트만 재생하고 나머지는 멈춘다 (모바일 디코더 절약) */
      Object.keys(videoEls).forEach(k => {
        const v = videoEls[k];
        if (!v) return;
        if (k === key) { v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
        else { try { v.pause(); } catch (e) {} }
      });
    },

    /* 장면 영상 — 선택 직후 한 번 재생. 끝나거나, 탭하거나, 로드에 실패하면 이어진다. */
    clip(key) {
      const ent = (window.EP.CLIP_SRC || {})[key];
      const src = ent && typeof ent === 'object' ? ent.src : ent;
      const endImg = ent && typeof ent === 'object' ? ent.endImg : '';
      const stage = document.getElementById('stage');
      if (!src || !stage) return Promise.resolve();
      return new Promise(resolve => {
        const wrap = document.createElement('div');
        wrap.className = 'cliplayer';
        const vid = document.createElement('video');
        vid.className = 'clipvid';
        vid.setAttribute('playsinline', ''); vid.playsInline = true;
        vid.preload = 'auto';
        vid.src = src;
        const skip = document.createElement('span');
        skip.className = 'clipskip';
        skip.textContent = '탭하면 건너뛰기';
        wrap.appendChild(vid); wrap.appendChild(skip);
        let done = false;
        const finish = () => {
          if (done) return; done = true;
          clearTimeout(guard);
          wrap.classList.remove('on');
          try { vid.pause(); } catch (e) {}
          setTimeout(() => wrap.remove(), 420);
          resolve();
        };
        let guard = setTimeout(finish, 15000);
        /* 영상이 끝나면 정해진 그림을 보여 주고, 탭하면 이어진다 */
        const toImage = () => {
          if (done || !endImg || wrap.classList.contains('img')) return finish();
          clearTimeout(guard); guard = setTimeout(finish, 60000);
          const img = document.createElement('img');
          img.className = 'clipimg'; img.alt = ''; img.src = endImg;
          img.addEventListener('error', finish);
          wrap.appendChild(img);
          skip.textContent = '탭하여 계속';
          requestAnimationFrame(() => wrap.classList.add('img'));
        };
        vid.addEventListener('ended', toImage);
        vid.addEventListener('error', finish);
        wrap.addEventListener('click', () => (endImg && !wrap.classList.contains('img')) ? toImage() : finish());
        stage.appendChild(wrap);
        requestAnimationFrame(() => wrap.classList.add('on'));
        /* 소리 설정이 꺼져 있으면 무음. 소리 재생이 막히면 무음으로 다시 시도한다. */
        const soundOn = !(window.EP.Audio && EP.Audio.cfg && EP.Audio.cfg.sfxOn === false);
        vid.muted = !soundOn;
        const p = vid.play();
        if (p && p.catch) p.catch(() => { vid.muted = true; vid.play().catch(finish); });
      });
    },

    /* 장면 점프·재시작 시 이전 세트의 전환 상태를 초기화 */
    reset(key) {
      document.getElementById('art').querySelectorAll('.set').forEach(s => {
        s.style.transition = 'none';
        s.classList.toggle('on', s.dataset.set === key);
        void s.offsetWidth;
        s.style.transition = '';
      });
    },

    fig(kind, opts = {}) {
      const layer = document.getElementById('figLayer');
      if (!layer) return null;
      if (opts.out) {
        const cur = layer.querySelector('.fig[data-k="' + kind + '"]');
        if (cur) { cur.classList.add('out'); setTimeout(() => cur.remove(), 520); }
        return null;
      }

      let el = layer.querySelector('.fig[data-k="' + kind + '"]');
      if (!el) {
        el = document.createElement('div');
        el.className = 'fig' + (kind === 'sunja' ? ' fig-sunja' : '') + (kind === 'hodu' ? ' fig-hodu' : '');
        el.dataset.k = kind;
        el.dataset.exp = 'default';
        el.style.left = opts.side === 'right' ? '72%' : '50%';
        el.innerHTML = kind === 'sunja' ? SUNJA : HODU;
        if (kind === 'hodu') { el.style.width = '360px'; el.style.height = '360px'; el.style.bottom = '346px'; el.style.left = '24%'; }
        layer.appendChild(el);
      }

      /* 표정은 컨테이너에 기억한다.
         (예전엔 .sunja 안 dataset 에만 저장했는데, 이미지 모드에서 .sunja 가 지워지면
          기억이 사라져 표정이 default 로 되돌아갔다.) */
      if (opts.exp) el.dataset.exp = opts.exp;
      const exp = opts.exp || el.dataset.exp || 'default';
      el.dataset.exp = exp;

      /* 정본 피겨 경로가 있으면 이미지로 교체 (표정별). 없으면 CSS 실루엣 유지. */
      const FS = window.EP.FIG_SRC || {};
      let src = '';
      if (kind === 'sunja' && FS.sunja) src = FS.sunja[exp] || FS.sunja.default || '';
      else if (kind === 'hodu' && FS.hodu) src = FS.hodu[opts.pose || 'sit'] || FS.hodu.sit || '';
      else if (FS[kind]) src = FS[kind][opts.exp || opts.pose || 'default'] || FS[kind].default || '';

      if (src) {
        let img = el.querySelector('.figimg');
        if (!img) {
          el.innerHTML = '';
          img = document.createElement('img');
          img.className = 'figimg';
          img.alt = '';
          img.decoding = 'async';
          img.addEventListener('error', () => { img.remove(); art_fallbackFig(el, kind, { exp: el.dataset.exp }); });
          el.appendChild(img);
        }
        if (img.getAttribute('src') !== src) img.src = src;
        el.dataset.figSrc = src;
        el.classList.add('has-img');
      } else if (!el.querySelector('.figimg')) {
        el.classList.remove('has-img');
      }

      /* 이미지 모드에서는 CSS 실루엣을 비워 둔다(중복 방지). 폴백에서는 반대로 지운다. */
      if (el.classList.contains('has-img')) {
        [...el.children].forEach(c => { if (!c.classList.contains('figimg')) c.remove(); });
      } else if (!el.querySelector('.sunja') && !el.querySelector('.hodu')) {
        el.innerHTML = kind === 'sunja' ? SUNJA : HODU;
        const s = el.querySelector('.sunja');
        if (s) s.dataset.exp = exp;
        if (kind === 'hodu') { el.style.width = '360px'; el.style.height = '360px'; el.style.bottom = '346px'; el.style.left = '24%'; }
      } else {
        const s = el.querySelector('.sunja');
        if (s) s.dataset.exp = exp;
      }

      if (opts.side) el.style.left = opts.side === 'right' ? (kind === 'hodu' ? '78%' : '72%') : (kind === 'hodu' ? '24%' : '50%');
      return el;
    },

    clearFigs() {
      const layer = document.getElementById('figLayer');
      if (layer) layer.innerHTML = '';
    },

    prop(name) {
      const layer = document.getElementById('propLayer');
      if (!layer) return;
      const map = {
        towel: `<div class="prop prop-towel in"><i></i><b></b></div>`,
        tea: `<div class="prop prop-tea in"><div class="st"></div><div class="cup"></div></div>`,
        key: `<div class="prop prop-key in"><div class="ring"></div><div class="shaft"></div><div class="bit"></div><div class="bit b2"></div></div>`
      };
      if (!map[name]) return;
      const holder = document.createElement('div');
      holder.innerHTML = map[name];
      const node = holder.firstElementChild;
      layer.appendChild(node);
      setTimeout(() => { node.style.opacity = '0'; setTimeout(() => node.remove(), 500); }, 5200);
    },

    clearProps() {
      const l = document.getElementById('propLayer');
      if (l) l.innerHTML = '';
    }
  };
})();
