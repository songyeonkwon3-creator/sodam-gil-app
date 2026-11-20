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

  /* 연습 — 보상 화면의 「복습하기」에서 쓰는 콘텐츠
     speak  : 따라 말하기 문장 (단어는 위 vocab 을 함께 쓴다). [이름] 은 플레이어 이름으로 바뀐다.
     dialog : 순자의 말에 대답하기. answers 중 가장 가까운 것을 골라 피드백을 보여 준다. */
  practice: {
    speak: [
      { ko: '비가 와요.',                     en: 'It’s raining.',                        scene: 'S02' },
      { ko: '안녕하세요. 잘 부탁드립니다.',    en: 'Hello. I look forward to staying here.', scene: 'S03' },
      { ko: '감사합니다.',                     en: 'Thank you.',                            scene: 'S03' },
      { ko: '신발은 여기서 벗어요.',           en: 'You take your shoes off here.',         scene: 'S04' },
      { ko: '실내화는 저기 있어요.',           en: 'The indoor slippers are over there.',   scene: 'S04' },
      { ko: '저는 [이름]입니다.',              en: 'I am [이름].',                          scene: 'S05' },
      { ko: '네, 괜찮아요.',                   en: 'Yes, it’s fine.',                       scene: 'S08' }
    ],
    dialog: [
      { id: 'D1', scene: 'S03', title: '첫 인사',
        sun: '비 많이 맞았네. 얼른 들어와요.', sunEn: 'You got soaked. Come in, quickly.', exp: 'worry',
        answers: [
          { ko: '안녕하세요. 잘 부탁드립니다.', grade: 'best', fb: '처음 만난 어른에게 딱 맞는 정중한 인사예요.', fbEn: 'A perfect polite greeting for an elder you’ve just met.' },
          { ko: '감사합니다.', grade: 'good', fb: '짧지만 분명한 감사 인사예요. ‘안녕하세요’를 먼저 붙이면 더 자연스러워요.', fbEn: 'Short and clear. Add ‘안녕하세요’ first to sound even more natural.' },
          { ko: '안녕! 고마워!', grade: 'casual', fb: '친구에게 쓰는 반말이에요. 처음 만난 어른에게는 ‘안녕하세요. 감사합니다.’가 자연스러워요.', fbEn: 'This is casual speech for friends. With an elder, say ‘안녕하세요. 감사합니다.’' }
        ] },
      { id: 'D2', scene: 'S05', title: '차 권하기',
        sun: '차 마실래요? 따뜻해요.', sunEn: 'Would you like some tea? It’s warm.', exp: 'smile',
        answers: [
          { ko: '감사합니다.', grade: 'best', fb: '권하는 것을 받을 때 쓰는 정중한 말이에요.', fbEn: 'The polite way to accept something offered.' },
          { ko: '네, 좋아요.', grade: 'good', fb: '‘네’로 대답하고 ‘좋아요’로 기분을 전했어요.', fbEn: 'You answered ‘yes’ and said you’d like it.' },
          { ko: '응, 줘.', grade: 'casual', fb: '친구 사이의 반말이에요. 순자에게는 ‘네, 감사합니다.’가 좋아요.', fbEn: 'Casual speech. To Sunja, say ‘네, 감사합니다.’' }
        ] },
      { id: 'D3', scene: 'S05', title: '이름 말하기',
        sun: '그런데 이름이 어떻게 돼요?', sunEn: 'By the way, what’s your name?', exp: 'default',
        answers: [
          { ko: '저는 [이름]입니다.', grade: 'best', fb: '‘저는 ○○입니다’는 이름을 정중하게 밝히는 말이에요.', fbEn: '‘저는 ○○입니다’ politely states your name.' },
          { ko: '제 이름은 [이름]이에요.', grade: 'good', fb: '조금 더 부드러운 말투예요. 이것도 자연스러워요.', fbEn: 'A slightly softer way to say it. Also natural.' },
          { ko: '[이름].', grade: 'casual', fb: '이름만 말하면 조금 짧게 들려요. ‘저는 ○○입니다’로 말해 보세요.', fbEn: 'Just the name sounds abrupt. Try ‘저는 ○○입니다’.' }
        ] },
      { id: 'D4', scene: 'S08', title: '방은 괜찮아요?',
        sun: '방은 괜찮아요? 춥지는 않고?', sunEn: 'Is the room all right? Not cold?', exp: 'worry',
        answers: [
          { ko: '네, 괜찮아요.', grade: 'best', fb: '‘괜찮아요’는 문제없다는 뜻이에요. 질문에 딱 맞는 대답이에요.', fbEn: '‘괜찮아요’ means it’s fine. A perfect answer.' },
          { ko: '네, 따뜻해요.', grade: 'good', fb: '‘춥지 않다’를 ‘따뜻해요’로 바꿔 말했어요. 좋아요.', fbEn: 'You answered ‘not cold’ with ‘it’s warm’. Nice.' },
          { ko: '응, 괜찮아.', grade: 'casual', fb: '친구 사이의 반말이에요. 순자에게는 ‘네, 괜찮아요.’가 자연스러워요.', fbEn: 'Casual speech. To Sunja, say ‘네, 괜찮아요.’' }
        ] }
    ]
  },

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
