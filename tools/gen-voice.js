#!/usr/bin/env node
/* ==========================================================================
   tools/gen-voice.js — 대사·단어·연습 문장을 Google Cloud Text-to-Speech 로 음성 파일로 만든다.

   준비 : Google Cloud 에서 Text-to-Speech API 를 켜고 API 키를 만든 뒤
          환경 변수 GOOGLE_TTS_API_KEY 에 넣는다.
   실행 :
     node tools/gen-voice.js --list-voices      한국어 목소리 목록
     node tools/gen-voice.js --samples          역할별 후보 목소리 샘플 → assets/voice/samples/
     node tools/gen-voice.js                    전체 생성 (이미 만든 파일은 건너뜀) + manifest 갱신
     node tools/gen-voice.js --force            전부 다시 생성
     node tools/gen-voice.js --dry              만들 문장 수만 세기 (키 없이)

   목소리 배정은 tools/voices.json 에서 바꾼다. 바꾸면 해당 역할 파일만 새로 만들어진다.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/voice');
const KEY = process.env.GOOGLE_TTS_API_KEY;
const args = new Set(process.argv.slice(2));
const API = 'https://texttospeech.googleapis.com/v1';

const VOICES = JSON.parse(fs.readFileSync(path.join(__dirname, 'voices.json'), 'utf8'));

/* 앱 스크립트를 브라우저 없이 읽는다 */
function loadEP() {
  const window = { EP: {} };
  const ctx = vm.createContext({ window, EP: window.EP, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, CustomEvent: function () {}, console });
  for (const f of ['app/content.js', 'app/data.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return window.EP;
}

const clean = t => String(t || '').replace(/[“”‘’"]/g, '').replace(/\s+/g, ' ').trim();

/* 음성으로 만들 문장 모으기 : [역할, 문장] */
function collect(EP) {
  const out = new Map();
  const add = (who, text) => {
    text = clean(text);
    if (!text || /\[이름\]/.test(text) || !VOICES.roles[who]) return;
    out.set(who + '|' + text, { who, text });
  };
  for (const sc of EP.SCENES) for (const b of sc.beats) if (b.t === 'line') add(b.who, b.ko);
  const C = EP.CONTENT_DEFAULT;
  for (const v of C.vocab || []) add('WORD', v.pron ? v.pron.replace(/[[\]]/g, '') : v.word);
  const P = C.practice || {};
  for (const s of P.speak || []) add('LEARN', s.ko);
  for (const d of P.dialog || []) { add('SUN', d.sun); for (const a of d.answers || []) add('LEARN', a.ko); }
  return [...out.values()];
}

async function synth(text, cfg) {
  const voice = { languageCode: 'ko-KR', name: cfg.name };
  const audioConfig = { audioEncoding: 'MP3' };
  if (cfg.rate) audioConfig.speakingRate = cfg.rate;
  if (cfg.pitch != null && !/Chirp/.test(cfg.name)) audioConfig.pitch = cfg.pitch;
  const res = await fetch(`${API}/text:synthesize?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice, audioConfig })
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${j.error && j.error.message}`);
  return Buffer.from(j.audioContent, 'base64');
}

const fileFor = (who, text, cfg) =>
  crypto.createHash('sha1').update(JSON.stringify([who, text, cfg])).digest('hex').slice(0, 12) + '.mp3';

async function main() {
  if (args.has('--dry')) {
    const items = collect(loadEP());
    const by = {}; items.forEach(i => { by[i.who] = (by[i.who] || 0) + 1; });
    console.log(items.length + '개 문장', JSON.stringify(by), '· 글자 수', items.reduce((n, i) => n + i.text.length, 0));
    return;
  }
  if (!KEY) { console.error('GOOGLE_TTS_API_KEY 환경 변수가 없습니다.'); process.exit(1); }

  if (args.has('--list-voices')) {
    const r = await fetch(`${API}/voices?languageCode=ko-KR&key=${KEY}`);
    const j = await r.json();
    (j.voices || []).forEach(v => console.log(v.name.padEnd(32), v.ssmlGender));
    return;
  }

  if (args.has('--samples')) {
    const dir = path.join(OUT, 'samples');
    fs.mkdirSync(dir, { recursive: true });
    for (const [who, list] of Object.entries(VOICES.candidates)) {
      const text = VOICES.sampleText[who];
      for (const name of list) {
        const cfg = Object.assign({}, VOICES.roles[who], { name });
        const f = path.join(dir, `${who}_${name}.mp3`);
        try { fs.writeFileSync(f, await synth(text, cfg)); console.log('sample', path.relative(ROOT, f)); }
        catch (e) { console.log('skip', name, e.message); }
      }
    }
    return;
  }

  const EP = loadEP();
  const items = collect(EP);
  const manifest = {};
  let made = 0, kept = 0;
  for (const it of items) {
    const cfg = VOICES.roles[it.who];
    const f = fileFor(it.who, it.text, cfg);
    const abs = path.join(OUT, f);
    if (!fs.existsSync(abs) || args.has('--force')) {
      fs.writeFileSync(abs, await synth(it.text, cfg));
      made++;
      process.stdout.write('.');
    } else kept++;
    manifest[it.who + '|' + it.text] = 'assets/voice/' + f;
  }
  /* manifest 에 없는 옛 파일 정리 */
  const used = new Set(Object.values(manifest).map(p => path.basename(p)));
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.mp3') && !used.has(f)) fs.unlinkSync(path.join(OUT, f));
  fs.writeFileSync(path.join(OUT, 'manifest.js'),
    '/* tools/gen-voice.js 가 만드는 파일. 직접 고치지 마세요. */\nwindow.EP = window.EP || {};\nEP.VOICE_FILES = ' +
    JSON.stringify(manifest, null, 1) + ';\n');
  console.log(`\n${items.length}개 문장 · 새로 만듦 ${made} · 그대로 ${kept}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
