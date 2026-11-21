/* ==========================================================================
   voice.js — 미리 만든 음성 파일 재생 (AI 음성 / 녹음)

   assets/voice/manifest.js 의 EP.VOICE_FILES 에 "역할|문장" → 파일 경로가 들어 있다.
   (tools/gen-voice.js 가 Google Cloud Text-to-Speech 로 만들어 채운다.)
   파일이 있는 문장은 그 파일을 재생하고, 없으면 지금처럼 브라우저 음성으로 읽는다.
   이름이 들어가는 문장([이름])은 사람마다 달라서 브라우저 음성으로 읽는다.
   ========================================================================== */
window.EP = window.EP || {};

(function () {
  const clean = t => String(t || '').replace(/[“”‘’"]/g, '').replace(/\s+/g, ' ').trim();
  let cur = null;

  /* 역할이 맞는 파일을 먼저, 없으면 같은 문장의 다른 역할 파일을 찾는다 */
  function find(text, who) {
    const files = window.EP.VOICE_FILES || {};
    const t = clean(text);
    if (!t) return '';
    if (who && files[who + '|' + t]) return files[who + '|' + t];
    const k = Object.keys(files).find(x => x.slice(x.indexOf('|') + 1) === t);
    return k ? files[k] : '';
  }

  EP.Voice = {
    find,
    has(text, who) { return !!find(text, who); },
    /* 재생에 성공하면 true. opts.rate : 재생 속도 (천천히 듣기 0.75) */
    play(text, who, opts) {
      const src = find(text, who);
      if (!src) return false;
      opts = opts || {};
      try {
        this.stop();
        const a = new Audio(src);
        a.volume = Math.max(0, Math.min(1, opts.volume == null ? 1 : opts.volume));
        if (opts.rate) { a.playbackRate = opts.rate; a.preservesPitch = true; }
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
        cur = a;
        return true;
      } catch (e) { return false; }
    },
    stop() {
      if (cur) { try { cur.pause(); } catch (e) {} cur = null; }
      try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
    }
  };
})();
