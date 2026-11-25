/* ==========================================================================
   voice.js — 미리 만든 음성 파일 재생 (AI 음성 / 녹음)

   assets/voice/manifest.js 의 EP.VOICE_FILES 에 "역할|문장" → 파일 경로가 들어 있다.
   (tools/gen-voice.js 가 Google Cloud Text-to-Speech 로 만들어 채운다.)
   파일이 있는 문장은 그 파일을 재생하고, 없으면 지금처럼 브라우저 음성으로 읽는다.
   이름이 들어가는 문장([이름])은 사람마다 달라서 브라우저 음성으로 읽는다.
   학습자가 「직접 말해 보기」로 녹음한 문장은 주인공 대사로 나올 때 그 녹음을 재생한다.
   ========================================================================== */
window.EP = window.EP || {};

(function () {
  const clean = t => String(t || '').replace(/[“”‘’"]/g, '').replace(/\s+/g, ' ').trim();
  let cur = null;

  /* 학습자가 직접 녹음한 문장 (speakback.js). 주인공(PC) 대사로 나올 때 AI 음성 대신 재생한다. */
  const USER = {};

  /* 역할이 맞는 파일을 먼저, 없으면 같은 문장의 다른 역할 파일을 찾는다 */
  function find(text, who) {
    const files = window.EP.VOICE_FILES || {};
    const t = clean(text);
    if (!t) return '';
    if (who === 'PC' && USER[t]) return USER[t];
    if (who && files[who + '|' + t]) return files[who + '|' + t];
    const k = Object.keys(files).find(x => x.slice(x.indexOf('|') + 1) === t);
    return k ? files[k] : '';
  }

  /* 휴대폰(특히 iPhone)은 탭 안에서 처음 재생한 소리 요소만 이후에 재생을 허락한다.
     그래서 소리 요소 하나를 만들어 첫 탭 때 무음으로 한 번 재생해 두고, 모든 대사를 그 요소로 재생한다. */
  const SILENT = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA';
  let el = null, unlocked = false;
  function player() {
    if (!el) { el = new Audio(); el.preload = 'auto'; el.setAttribute('playsinline', ''); }
    return el;
  }
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    try {
      const a = player();
      if (!a.src || a.paused) {
        a.src = SILENT;
        const p = a.play();
        if (p && p.catch) p.catch(() => { unlocked = false; });
      }
    } catch (e) { unlocked = false; }
  }
  ['touchend', 'pointerup', 'click', 'keydown'].forEach(ev =>
    window.addEventListener(ev, unlock, { capture: true, passive: true }));

  EP.Voice = {
    find,
    has(text, who) { return !!find(text, who); },
    setUser(text, url) { const t = clean(text); if (t) USER[t] = url; },
    userFor(text) { return USER[clean(text)] || ''; },
    unlock,
    /* 재생을 시작하면 true. opts.rate : 재생 속도 (천천히 듣기 0.75)
       opts.fallback : 휴대폰이 재생을 막았을 때 대신 실행할 함수 (브라우저 음성) */
    play(text, who, opts) {
      const src = find(text, who);
      if (!src) return false;
      opts = opts || {};
      try {
        this.stop();
        const a = player();
        a.src = src;
        a.volume = Math.max(0, Math.min(1, opts.volume == null ? 1 : opts.volume));
        a.playbackRate = opts.rate || 1;
        a.preservesPitch = true;
        cur = a;
        const p = a.play();
        if (p && opts.onStart) p.then(() => { if (cur === a && !a.paused) opts.onStart(); }, () => {});
        if (p && p.catch) p.catch(err => {
          if (cur === a && err && err.name !== 'AbortError' && typeof opts.fallback === 'function') opts.fallback();
        });
        return true;
      } catch (e) { return false; }
    },
    stop() {
      if (cur) { try { cur.pause(); } catch (e) {} cur = null; }
      try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
    }
  };
})();
