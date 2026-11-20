/* ==========================================================================
   audio.js — 사운드 (음악 · 효과음 · 음성)

   이 빌드는 오디오 파일 없이 브라우저에서 직접 합성한다(WebAudio).
   · 음악 : 장면마다 다른 잔잔한 피아노/패드 루프를 실시간 생성
   · 효과음 : 비 · 발소리 · 초인종 · 고양이 · 대문 · 상자 · 노크 · 알림
   · 음성 : 브라우저 한국어 음성(speechSynthesis)으로 대사를 읽는다

   실제 음원을 넣고 싶으면 EP.AUDIO_SRC 에 파일 경로를 채우면
   그 자리에서 합성음을 대신한다 (없으면 지금처럼 합성).
   ========================================================================== */
window.EP = window.EP || {};

EP.AUDIO_SRC = {
  /* 예) bell: 'app/audio/bell.mp3' */
};

(function () {
  const SAVE = 'ep01.audio.v1';
  const defaults = { master: 0.8, music: 0.5, sfx: 0.8, voice: 0.9, voiceOn: true, sfxOn: true, musicOn: true };

  function load() {
    try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(SAVE) || '{}')); }
    catch (e) { return Object.assign({}, defaults); }
  }

  let cfg = load();
  let ctx = null, master = null, busMusic = null, busSfx = null, verb = null;
  let started = false;
  let sceneKey = null, sceneId = null;
  let musicTimer = null, rainNode = null, rainGain = null;
  let lastVoice = 0;

  const save = () => { try { localStorage.setItem(SAVE, JSON.stringify(cfg)); } catch (e) {} };

  /* ---------------- 기본 그래프 ---------------- */
  function impulse(seconds, decay) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = cfg.master;
    master.connect(ctx.destination);

    verb = ctx.createConvolver();
    verb.buffer = impulse(2.4, 2.6);
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.34;
    verb.connect(verbGain);
    verbGain.connect(master);

    busMusic = ctx.createGain();
    busMusic.gain.value = cfg.musicOn ? cfg.music : 0;
    busMusic.connect(master);
    const mSend = ctx.createGain(); mSend.gain.value = 0.5; busMusic.connect(mSend); mSend.connect(verb);

    busSfx = ctx.createGain();
    busSfx.gain.value = cfg.sfxOn ? cfg.sfx : 0;
    busSfx.connect(master);
    const sSend = ctx.createGain(); sSend.gain.value = 0.22; busSfx.connect(sSend); sSend.connect(verb);
    return ctx;
  }

  function ramp(param, v, t) {
    try { param.setTargetAtTime(v, ctx.currentTime, t || 0.08); } catch (e) { param.value = v; }
  }

  /* ---------------- 음악 : 잔잔한 생성 루프 ---------------- */
  /* D 장조 펜타토닉 — 밤 장면은 A 단조 쪽으로 기운다 */
  const SCALES = {
    day:   [0, 2, 4, 7, 9, 12, 14, 16, 19],
    night: [0, 2, 3, 7, 8, 12, 14, 15, 19],
    sad:   [0, 2, 3, 5, 7, 10, 12, 14, 15]
  };
  const ROOTS = { day: 62, night: 57, sad: 55 }; /* D4 / A3 / G3 */

  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  function pluck(midi, when, gain, decay) {
    const t = when;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'triangle';
    o2.type = 'sine';
    o.frequency.value = hz(midi);
    o2.frequency.value = hz(midi) * 2.002;
    f.type = 'lowpass';
    f.frequency.value = 2200;
    f.Q.value = 0.6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (decay || 2.2));
    o.connect(f); o2.connect(f); f.connect(g); g.connect(busMusic);
    o.start(t); o2.start(t);
    o.stop(t + (decay || 2.2) + 0.05); o2.stop(t + (decay || 2.2) + 0.05);
  }

  function pad(midi, when, dur, gain) {
    const t = when;
    [0, 0.6].forEach((det, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      o.type = i ? 'triangle' : 'sawtooth';
      o.frequency.value = hz(midi) * (1 + (i ? 0.004 : -0.003));
      f.type = 'lowpass';
      f.frequency.value = 620;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + dur * 0.45);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(busMusic);
      o.start(t); o.stop(t + dur + 0.1);
    });
  }

  let beat = 0;
  function scheduleMusic() {
    if (!ctx || !cfg.musicOn) return;
    const mood = sceneKey === 'night' ? 'night' : (sceneKey === 'door' || sceneKey === 'roomNight') ? 'sad' : 'day';
    const scale = SCALES[mood];
    const root = ROOTS[mood];
    const t = ctx.currentTime + 0.08;

    /* 4비트마다 낮은 패드 */
    if (beat % 4 === 0) {
      const chordRoot = root - 12 + scale[(Math.floor(beat / 4) * 3) % 4];
      pad(chordRoot, t, 4.4, 0.055);
      pad(chordRoot + 7, t, 4.4, 0.032);
    }
    /* 멜로디 : 성긴 아르페지오 */
    if (beat % 2 === 0 || Math.random() < 0.34) {
      const idx = Math.floor(Math.random() * scale.length);
      const oct = Math.random() < 0.28 ? 12 : 0;
      pluck(root + scale[idx] + oct, t, 0.085 + Math.random() * 0.03, 2.6);
    }
    beat++;
  }

  function startMusic() {
    if (!ensure() || musicTimer) return;
    scheduleMusic();
    musicTimer = setInterval(scheduleMusic, 1100);
  }
  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  /* ---------------- 효과음 ---------------- */
  function noiseBuffer(sec) {
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  const SFX = {
    /* 비 : 필터된 노이즈 루프 */
    rain(on) {
      if (!ctx) return;
      if (on && !rainNode) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(3.2);
        src.loop = true;
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200;
        rainGain = ctx.createGain(); rainGain.gain.value = 0.0001;
        src.connect(hp); hp.connect(lp); lp.connect(rainGain); rainGain.connect(busSfx);
        src.start();
        rainNode = src;
        ramp(rainGain.gain, 0.075, 0.9);
      } else if (!on && rainNode) {
        ramp(rainGain.gain, 0.0001, 0.6);
        const n = rainNode; rainNode = null;
        setTimeout(() => { try { n.stop(); } catch (e) {} }, 1200);
      }
    },
    footsteps() {
      [0, 0.22, 0.44].forEach((d, i) => {
        const t = ctx.currentTime + d;
        const src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.12);
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18 - i * 0.03, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        src.connect(f); f.connect(g); g.connect(busSfx); src.start(t); src.stop(t + 0.2);
      });
    },
    knock() {
      [0, 0.19, 0.38].forEach(d => {
        const t = ctx.currentTime + d;
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(80, t + 0.1);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g); g.connect(busSfx); o.start(t); o.stop(t + 0.2);
      });
    },
    bell() {
      const t = ctx.currentTime;
      [[784, 0], [1046, 0.16]].forEach(([f, d]) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.01;
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.exponentialRampToValueAtTime(0.15, t + d + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.85);
        o.connect(g); o2.connect(g); g.connect(busSfx);
        o.start(t + d); o2.start(t + d); o.stop(t + d + 0.9); o2.stop(t + d + 0.9);
      });
    },
    cat() {
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
      o.type = 'triangle';
      o.frequency.setValueAtTime(560, t);
      o.frequency.linearRampToValueAtTime(760, t + 0.18);
      o.frequency.linearRampToValueAtTime(520, t + 0.5);
      f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 1.4;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.06);
      g.gain.linearRampToValueAtTime(0.0001, t + 0.55);
      o.connect(f); f.connect(g); g.connect(busSfx); o.start(t); o.stop(t + 0.6);
    },
    gate() {
      const t = ctx.currentTime;
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.7);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass';
      f.frequency.setValueAtTime(320, t); f.frequency.linearRampToValueAtTime(760, t + 0.5);
      f.Q.value = 2.4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.10, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
      src.connect(f); f.connect(g); g.connect(busSfx); src.start(t); src.stop(t + 0.7);
    },
    box() {
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(96, t);
      o.frequency.exponentialRampToValueAtTime(58, t + 0.3);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(g); g.connect(busSfx); o.start(t); o.stop(t + 0.45);
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.3);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.05, t + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      src.connect(hp); hp.connect(g2); g2.connect(busSfx); src.start(t + 0.02); src.stop(t + 0.35);
    },
    notify() {
      const t = ctx.currentTime;
      [[1318, 0], [1760, 0.11]].forEach(([f, d]) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.exponentialRampToValueAtTime(0.11, t + d + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.4);
        o.connect(g); g.connect(busSfx); o.start(t + d); o.stop(t + d + 0.45);
      });
    },
    tap() {
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 2100;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.035, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(g); g.connect(busSfx); o.start(t); o.stop(t + 0.08);
    },
    card() {
      const t = ctx.currentTime;
      [880, 1320].forEach((f, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.045, t + i * 0.06 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.4);
        o.connect(g); g.connect(busSfx); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.45);
      });
    },
    page() {
      const t = ctx.currentTime;
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.4);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.06, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      src.connect(f); f.connect(g); g.connect(busSfx); src.start(t); src.stop(t + 0.42);
    }
  };

  /* ---------------- 음성 (speechSynthesis) ---------------- */
  let voices = [];
  function collectVoices() {
    if (!('speechSynthesis' in window)) return;
    voices = window.speechSynthesis.getVoices() || [];
  }
  if ('speechSynthesis' in window) {
    collectVoices();
    window.speechSynthesis.addEventListener('voiceschanged', collectVoices);
  }
  const koVoice = () => voices.find(v => /^ko(-|_)?/i.test(v.lang)) || voices.find(v => /korean/i.test(v.name)) || null;

  const VOICE_STYLE = {
    NAR: { rate: 0.94, pitch: 0.98 },
    PC:  { rate: 1.0, pitch: 1.06 },
    SUN: { rate: 0.88, pitch: 0.86 },
    MSG: { rate: 1.02, pitch: 1.12 }
  };

  function speak(text, who) {
    if (!cfg.voiceOn) return false;
    const clean = String(text || '').replace(/\[이름\]/g, '').replace(/[“”‘’]/g, '').trim();
    if (!clean) return false;
    const now = Date.now();
    if (now - lastVoice < 260) return false;
    lastVoice = now;
    /* 미리 만든 음성 파일(AI 음성)이 있으면 그것을 재생 */
    if (window.EP.Voice && EP.Voice.play(clean, who, { volume: Math.min(1, cfg.voice) })) return true;
    if (!('speechSynthesis' in window)) return false;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      const v = koVoice();
      if (v) u.voice = v;
      u.lang = 'ko-KR';
      const st = VOICE_STYLE[who] || VOICE_STYLE.NAR;
      u.rate = st.rate;
      u.pitch = st.pitch;
      u.volume = Math.min(1, cfg.voice);
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- 공개 API ---------------- */
  const Audio = EP.Audio = {
    get cfg() { return Object.assign({}, cfg); },
    get ready() { return started; },
    get state() { return ctx ? ctx.state : 'none'; },
    get musicRunning() { return !!musicTimer; },
    hasKoreanVoice() { return !!koVoice(); },

    /* 첫 사용자 제스처에서 호출 — 자동재생 정책 대응 */
    init() {
      if (started) return;
      ensure();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      started = true;
      startMusic();
      if (sceneKey === 'alley') SFX.rain(true);
    },

    set(patch) {
      Object.assign(cfg, patch);
      save();
      if (!ctx) return;
      ramp(master.gain, cfg.master);
      ramp(busMusic.gain, cfg.musicOn ? cfg.music : 0);
      ramp(busSfx.gain, cfg.sfxOn ? cfg.sfx : 0);
      if (cfg.musicOn) startMusic(); else stopMusic();
      if (!cfg.voiceOn && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    },

    /* 장면 전환 : 음악 무드 + 비 소리 */
    scene(key, id) {
      sceneKey = key;
      sceneId = id;
      if (!ctx || !started) return;
      SFX.rain(key === 'alley' || key === 'alleyEvening' || key === 'gate');
      if (!musicTimer && cfg.musicOn) startMusic();
    },

    sfx(name) {
      if (!ctx || !started || !cfg.sfxOn) return;
      if (EP.AUDIO_SRC[name]) { /* 실음원이 있으면 그쪽이 재생 (아래 playFile) */ }
      const fn = SFX[name];
      if (fn) { try { fn(); } catch (e) {} }
    },

    /* 대사 읽기 : 내레이션·인물 대사만 (효과음 캡션 제외) */
    voice(text, who) {
      if (who === 'SFX' || who === 'SYS') return;
      speak(text, who);
    },

    stopVoice() { if (window.EP.Voice) EP.Voice.stop(); else if ('speechSynthesis' in window) window.speechSynthesis.cancel(); },

    /* 화면에 음성 지원 여부를 알려 준다 */
    voiceNote() {
      if (!('speechSynthesis' in window)) return '이 브라우저는 음성을 지원하지 않아요.';
      return koVoice() ? '한국어 음성으로 읽어 줍니다.' : '한국어 음성이 설치되어 있지 않아, 기본 음성으로 읽습니다.';
    }
  };
})();
