/* ==========================================================================
   speakback.js — 고른 말을 학습자가 직접 소리 내어 말해 보기

   · 말하는 선택지(LANG, 또는 say 가 있는 선택지)와 자기소개(L02)를 고른 뒤 뜬다.
   · ▶ 듣기 : AI 음성 / ● 말해 보기 : 내 목소리를 녹음 / ▶ 내 목소리 : 다시 듣기
   · 녹음한 문장은 EP.Voice 에 '내 목소리'로 등록된다.
     → 이야기에서 주인공이 같은 문장을 말할 때(예: 05-06 「저는 ○○입니다.」) AI 음성 대신 내 목소리가 나온다.
   · 마이크를 쓸 수 없으면 듣기와 「계속」만 보인다. 언제든 「계속」으로 넘어갈 수 있다.
   ========================================================================== */
window.EP = window.EP || {};

(function () {
  const canRec = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let stream = null;

  async function recordOnce(maxMs, isClosed) {
    if (!stream || !stream.active) stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    if (isClosed()) { releaseMic(); return ''; }
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise((resolve, reject) => {
      rec.onstop = resolve;
      rec.onerror = event => reject(event.error || new Error('Recording failed'));
    });
    rec.start();
    const t = setTimeout(() => rec.state !== 'inactive' && rec.stop(), maxMs || 6000);
    recordOnce.stop = () => { clearTimeout(t); if (rec.state !== 'inactive') rec.stop(); };
    try { await stopped; } finally { clearTimeout(t); recordOnce.stop = null; }
    if (!chunks.length) throw new Error('Empty recording');
    return URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || type || 'audio/webm' }));
  }
  function releaseMic() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  }

  function playUrl(url) {
    try { if (window.EP.Voice) EP.Voice.stop(); } catch (e) {}
    const a = new Audio(url);
    a.play().catch(() => {});
    return a;
  }

  /* opts : { text, en, who, note }  → 「계속」을 누르면 끝난다 */
  function run(opts) {
    const host = document.getElementById('stageui');
    if (!host || !opts || !opts.text) return Promise.resolve();
    const text = opts.text;
    return new Promise(resolve => {
      const card = document.createElement('div');
      card.className = 'sb-card';
      card.innerHTML = `
        <p class="sb-k">직접 말해 보세요</p>
        <p class="sb-t">${esc(text)}</p>
        ${opts.en ? `<p class="sb-en">${esc(opts.en)}</p>` : ''}
        <div class="sb-btns">
          <button type="button" class="sb-b" data-listen>▶ 듣기</button>
          ${canRec ? '<button type="button" class="sb-b rec" data-rec>● 말해 보기</button>' : ''}
          <button type="button" class="sb-b mine" data-mine hidden>▶ 내 목소리</button>
        </div>
        <p class="sb-msg">${canRec ? esc(opts.note || '듣고 따라 말해 보세요. 녹음하면 내 목소리로 다시 들을 수 있어요.') : '이 브라우저에서는 마이크를 쓸 수 없어요. 듣고 소리 내어 따라 해 보세요.'}</p>
        <button type="button" class="sb-next" data-next>계속</button>`;
      host.appendChild(card);
      host.classList.add('sb-on');
      requestAnimationFrame(() => card.classList.add('in'));

      const msg = card.querySelector('.sb-msg');
      const recBtn = card.querySelector('[data-rec]');
      const mineBtn = card.querySelector('[data-mine]');
      let closed = false;
      let minePlayer = null;
      let mine = (window.EP.Voice && EP.Voice.userFor) ? EP.Voice.userFor(text) : '';
      if (mine) mineBtn.hidden = false;

      card.querySelector('[data-listen]').addEventListener('click', () => {
        minePlayer?.pause();
        const playback = {
          onStart: () => { if (!closed) msg.textContent = '예시 음성이 재생됐어요. 듣고 따라 말해 보세요.'; },
          onError: () => { if (!closed) msg.textContent = '예시 음성을 재생할 수 없어요. 소리 설정과 한국어 음성 지원을 확인해 주세요.'; }
        };
        if (!EP.Audio?.voice(text, opts.who || 'LEARN', playback)) playback.onError();
      });
      mineBtn.addEventListener('click', () => {
        if (!mine) return;
        minePlayer?.pause();
        minePlayer = playUrl(mine);
      });
      if (recBtn) recBtn.addEventListener('click', async () => {
        if (recBtn.classList.contains('on')) { if (recordOnce.stop) recordOnce.stop(); return; }
        recBtn.classList.add('on');
        recBtn.textContent = '■ 그만하기';
        msg.textContent = '듣고 있어요… 말을 마치면 「그만하기」를 누르세요.';
        minePlayer?.pause();
        try { if (window.EP.Voice) EP.Voice.stop(); } catch (e) {}
        try {
          const url = await recordOnce(7000, () => closed);
          if (closed) { if (url) URL.revokeObjectURL(url); return; }
          if (mine) URL.revokeObjectURL(mine);
          mine = url;
          if (window.EP.Voice && EP.Voice.setUser) EP.Voice.setUser(text, url);
          mineBtn.hidden = false;
          msg.textContent = '녹음했어요! 「내 목소리」로 들어 보고, 마음에 들지 않으면 다시 말해 보세요.';
          recBtn.textContent = '● 다시 말하기';
        } catch (e) {
          if (closed) return;
          msg.textContent = e.name === 'NotFoundError'
            ? '사용할 수 있는 마이크가 없어요. 연결 상태를 확인하거나 「계속」을 누르세요.'
            : e.name === 'NotAllowedError'
              ? '이 브라우저에서 마이크 접근이 허용되지 않았어요. 권한을 확인하거나 「계속」을 누르세요.'
              : '녹음을 완료하지 못했어요. 마이크를 확인하고 다시 시도하거나 「계속」을 누르세요.';
          recBtn.textContent = '● 말해 보기';
        } finally {
          if (!closed) releaseMic();
          recBtn.classList.remove('on');
        }
      });
      card.querySelector('[data-next]').addEventListener('click', () => {
        if (closed) return;
        closed = true;
        minePlayer?.pause();
        EP.Audio?.stopVoice();
        if (recordOnce.stop) recordOnce.stop();
        releaseMic();
        card.classList.remove('in');
        host.classList.remove('sb-on');
        setTimeout(() => card.remove(), 260);
        resolve();
      });
    });
  }

  EP.SpeakBack = { run, canRec };
})();
