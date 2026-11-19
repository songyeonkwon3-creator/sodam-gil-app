/* ==========================================================================
   content.js — EP01 학습 콘텐츠 · 에피소드 설정 (관리자 페이지에서 편집 가능)

   보상 화면의 「오늘 배운 것」 카드와 관리자 페이지가 같은 데이터를 읽는다.
   관리자 페이지(admin.html)에서 고친 값은 localStorage 예: ep01.content.v1 에
   저장되고, 이 파일의 기본값 위에 덮인다. → 앱을 다시 열면 바로 반영된다.
   ========================================================================== */
window.EP = window.EP || {};

EP.CONTENT_DEFAULT = {
  version: 1,
  episode: {
    series: '서울살이, 서른 날',
    no: 'EP.01',
    title: '비 오는 소담길',
    day: 'DAY 1',
    nextTitle: 'DAY 2 〈골목 끝의 작은 카페〉'
  },

  /* 오늘 배운 단어 — 장면 표시 */
  vocab: [
    { word: '여기', roman: 'yeogi',   ko: '이곳',           en: 'here',            scene: 'S02' },
    { word: '비',   roman: 'bi',      ko: '하늘에서 오는 물', en: 'rain',            scene: 'S02' },
    { word: '벗다', roman: 'beotda',  ko: '신발을 떼어 내다', en: 'to take off',     scene: 'S04' },
    { word: '신다', roman: 'sinda',   ko: '신발을 발에 걸치다', en: 'to put on (shoes)', scene: 'S04' },
    { word: '열쇠', roman: 'yeolsoe', ko: '문을 여는 물건',   en: 'key',             scene: 'S05' },
    { word: '사진', roman: 'sajin',   ko: '빛으로 남긴 그림', en: 'photograph',      scene: 'S07' }
  ],

  /* 오늘 배운 문법 */
  grammar: [
    { form: '-아요 / -어요', ko: '정중하게 지금 일어나는 일을 말해요.', eg: '비가 와요.', meaning: 'It’s raining.' },
    { form: '-(으)세요',     ko: '부드럽게 부탁하거나 권해요.',        eg: '신발은 여기서 벗어요.', meaning: 'You take your shoes off here.' },
    { form: '입니다',        ko: '이름·신분을 정중하게 밝혀요.',        eg: '저는 하나입니다.', meaning: 'I am Hana.' }
  ],

  /* 앱 설정 — 게임 동작에 실제로 걸린다 */
  settings: {
    translateDefault: false,   /* 번역 기본 ON/OFF */
    cardAutoMs: 4500,          /* 조사 카드 자동 소멸 (ms) */
    hintAuto: false            /* 장면 진입 시 1단계 힌트 자동 열기 */
  }
};

(function () {
  const KEY = 'ep01.content.v1';

  const clone = o => JSON.parse(JSON.stringify(o));

  function merge(base, over) {
    if (!over || typeof over !== 'object') return base;
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(over).forEach(k => {
      const b = out[k], o = over[k];
      out[k] = (b && typeof b === 'object' && !Array.isArray(b) && o && typeof o === 'object' && !Array.isArray(o))
        ? merge(b, o)
        : o;
    });
    return out;
  }

  const Content = window.EP.Content = {
    get data() {
      let over = null;
      try { over = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
      return merge(clone(EP.CONTENT_DEFAULT), over);
    },
    save(patch) {
      const next = merge(this.data, patch);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
      window.dispatchEvent(new CustomEvent('ep:content'));
      return next;
    },
    reset() {
      try { localStorage.removeItem(KEY); } catch (e) {}
      window.dispatchEvent(new CustomEvent('ep:content'));
      return this.data;
    },
    key: KEY
  };
})();
